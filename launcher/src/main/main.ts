import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { InstanceService } from './services/instanceService.js';
import { SettingsService } from './services/settingsService.js';
import { PackInstaller } from './services/packInstaller.js';
import { ConfigPresetService } from './services/configPresetService.js';
import { MinecraftPaths } from './services/minecraftPaths.js';
import { LaunchService } from './services/launchService.js';
import { MicrosoftAuthService } from './services/microsoftAuthService.js';
import { ModrinthService } from './services/modrinthService.js';
import { syncClientCoreConfig } from './services/clientConfigService.js';
import * as WorldService from './services/worldService.js';
import * as ServerService from './services/serverService.js';
import * as SkinService from './services/skinService.js';
import {
  initSecureTokenStore,
  getSecureTokenStore,
  extractTokensFromSettings,
  sanitizeAccount,
  hydrateAccount,
  hasTokens,
} from './services/secureTokenStore.js';
import type { RichAccount } from './services/settingsService.js';


// Resolve directory name for ESM stability
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 1000,
    minHeight: 650,
    titleBarStyle: 'hidden', // Sleek modern custom frame-less layout feel
    titleBarOverlay: {
      color: '#0B0C10',
      symbolColor: '#66FCF1',
      height: 35
    },
    backgroundColor: '#0B0C10',
    webPreferences: {
      // Electron executes preload files as CommonJS. The app package is ESM,
      // so this must use the explicitly CommonJS .cjs bundle.
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Check if we are in dev mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Boots the encrypted token store and, once, moves any tokens a previous
 * version left in plaintext settings.json into it.
 */
function setupSecureTokenStore() {
  const store = initSecureTokenStore(
    path.join(MinecraftPaths.getLauncherDataDir(), 'secure-tokens.bin'),
    {
      isAvailable: () => safeStorage.isEncryptionAvailable(),
      encrypt: (plain) => safeStorage.encryptString(plain),
      decrypt: (cipher) => safeStorage.decryptString(cipher),
    }
  );

  try {
    const settings = SettingsService.getSettings();
    const legacyTokens = extractTokensFromSettings(settings);
    const names = Object.keys(legacyTokens);
    if (names.length > 0) {
      for (const name of names) {
        store.setTokens(name, legacyTokens[name]);
      }
      // saveSettings sanitizes, so this rewrite drops the plaintext tokens.
      SettingsService.saveSettings(settings);
      console.log(`[SecureTokenStore] Migrated tokens for ${names.length} account(s) out of settings.json.`);
    }
  } catch (err: any) {
    console.error('[SecureTokenStore] Token migration failed:', err.message);
  }
}

app.whenReady().then(() => {
  setupSecureTokenStore();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // Global settings
  ipcMain.handle('get-settings', () => {
    return SettingsService.getSettings();
  });

  ipcMain.handle('save-settings', async (_event, settings) => {
    SettingsService.saveSettings(settings);
    // Deleting an account in the UI must also drop its stored session tokens.
    try {
      const names = Array.isArray(settings?.richAccounts)
        ? settings.richAccounts.map((a: RichAccount) => a?.name).filter(Boolean)
        : [];
      getSecureTokenStore()?.pruneTo(names);
    } catch (err: any) {
      console.error('Failed to prune secure token store:', err.message);
    }
    // Push mod/HUD settings into every profile so the companion mod picks them
    // up on the next launch regardless of which profile is started.
    await Promise.all(
      InstanceService.getInstances().map(async (instance) => {
        try {
          await syncClientCoreConfig(MinecraftPaths.getInstanceDir(instance.id), settings);
        } catch (err: any) {
          console.error(`Failed to sync client-core config for ${instance.id}:`, err.message);
        }
      })
    );
    return true;
  });

  // Profiles list
  ipcMain.handle('get-instances', () => {
    return InstanceService.getInstances();
  });

  // Create profile
  ipcMain.handle('create-instance', (_event, name: string, mcVersion: string) => {
    return InstanceService.createInstance(name, mcVersion);
  });

  // Update profile
  ipcMain.handle('update-instance', (_event, config) => {
    InstanceService.updateInstance(config);
    return true;
  });

  // Delete profile
  ipcMain.handle('delete-instance', (_event, id: string) => {
    InstanceService.deleteInstance(id);
    return true;
  });

  // Read pack manifest JSON from workspace
  ipcMain.handle('get-pack-manifest', () => {
    try {
      const packsDir = ConfigPresetService.getPacksDir();
      const manifestFile = path.join(packsDir, 'standard', 'pack.json');
      if (fsExists(manifestFile)) {
        const raw = fsRead(manifestFile);
        return JSON.parse(raw);
      }
    } catch (err: any) {
      console.error('Failed to read pack manifest:', err.message);
    }
    return null;
  });

  // Install Modpack queue (realtime events mapped to renderer)
  ipcMain.handle('install-pack', async (_event, instanceConfig) => {
    const onProgress = (percent: number, currentStep: string) => {
      if (mainWindow) {
        mainWindow.webContents.send(`pack-install-progress-${instanceConfig.id}`, {
          percent,
          currentStep
        });
      }
    };

    const onLog = (message: string, level: 'info' | 'warn' | 'error') => {
      if (mainWindow) {
        mainWindow.webContents.send(`pack-install-log-${instanceConfig.id}`, {
          timestamp: new Date().toLocaleTimeString(),
          level,
          message
        });
      }
    };

    try {
      const success = await PackInstaller.install(instanceConfig, onProgress, onLog);
      return success;
    } catch (err: any) {
      onLog(`Unexpected installer crash: ${err.message}`, 'error');
      return false;
    }
  });

  // Launch Minecraft Client
  ipcMain.handle('launch-game', async (_event, instanceId: string) => {
    try {
      const result = await LaunchService.launch(instanceId);
      return result;
    } catch (err: any) {
      console.error('Launch execution failed:', err);
      return {
        success: false,
        message: `Execution failed: ${err.message}`
      };
    }
  });

  // Microsoft OAuth Auth Flow
  ipcMain.handle('microsoft-login-start', async () => {
    try {
      const flow = await MicrosoftAuthService.startDeviceCodeFlow();
      return { success: true, flow };
    } catch (err: any) {
      console.error('Failed to start Microsoft Login Flow:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('microsoft-login-poll', async (_event, deviceCode: string, interval: number) => {
    try {
      await MicrosoftAuthService.pollDeviceToken(deviceCode, interval, (status, details) => {
        // Tokens stay in the main process: on success they go straight into
        // the encrypted store, and the renderer only ever sees the profile.
        let safeDetails = details;
        if (status === 'SUCCESS' && details && typeof details === 'object') {
          const account = details as RichAccount;
          if (hasTokens(account)) {
            getSecureTokenStore()?.setTokens(account.name, {
              accessToken: account.accessToken,
              refreshToken: account.refreshToken,
              expiresAt: account.expiresAt,
            });
          }
          safeDetails = sanitizeAccount(account);
        }
        if (mainWindow) {
          mainWindow.webContents.send('microsoft-login-status', { status, details: safeDetails });
        }
      });
      return true;
    } catch (err: any) {
      console.error('Failed polling Microsoft token:', err.message);
      return false;
    }
  });

  ipcMain.handle('microsoft-login-stop', () => {
    MicrosoftAuthService.stopPolling();
    return true;
  });

  // Modrinth search and installation
  ipcMain.handle('modrinth-search', (_event, query: string, mcVersion?: string) => {
    return ModrinthService.searchMods(query, mcVersion);
  });

  ipcMain.handle('modrinth-install', async (_event, instanceId: string, projectId: string, mcVersion?: string) => {
    const onProgress = (percent: number) => {
      if (mainWindow) {
        mainWindow.webContents.send(`modrinth-install-progress-${instanceId}-${projectId}`, percent);
      }
    };
    try {
      const result = await ModrinthService.installModToInstance(
        MinecraftPaths.getInstanceModsDir(instanceId),
        projectId,
        mcVersion,
        onProgress
      );
      return result;
    } catch (err: any) {
      console.error('Failed to install Modrinth mod:', err.message);
      return { success: false, error: err.message };
    }
  });

  // -------------------------------------------------------------------------
  // Singleplayer worlds — real saves/ folder operations
  // -------------------------------------------------------------------------

  ipcMain.handle('worlds-list', (_event, instanceId: string) =>
    WorldService.listWorlds(MinecraftPaths.getInstanceDir(instanceId))
  );

  ipcMain.handle('world-rename', (_event, instanceId: string, folderName: string, newName: string) =>
    WorldService.renameWorld(MinecraftPaths.getInstanceDir(instanceId), folderName, newName)
  );

  ipcMain.handle('world-delete', (_event, instanceId: string, folderName: string) =>
    WorldService.deleteWorld(MinecraftPaths.getInstanceDir(instanceId), folderName)
  );

  ipcMain.handle('world-duplicate', (_event, instanceId: string, folderName: string) =>
    WorldService.duplicateWorld(MinecraftPaths.getInstanceDir(instanceId), folderName)
  );

  // -------------------------------------------------------------------------
  // Multiplayer servers — real servers.dat plus live status pings
  // -------------------------------------------------------------------------

  ipcMain.handle('servers-list', (_event, instanceId: string) =>
    ServerService.listServers(MinecraftPaths.getInstanceDir(instanceId))
  );

  ipcMain.handle('server-add', (_event, instanceId: string, name: string, ip: string) =>
    ServerService.addServer(MinecraftPaths.getInstanceDir(instanceId), name, ip)
  );

  ipcMain.handle('server-update', (_event, instanceId: string, index: number, name: string, ip: string) =>
    ServerService.updateServer(MinecraftPaths.getInstanceDir(instanceId), index, name, ip)
  );

  ipcMain.handle('server-delete', (_event, instanceId: string, index: number) =>
    ServerService.deleteServer(MinecraftPaths.getInstanceDir(instanceId), index)
  );

  ipcMain.handle('server-ping', (_event, address: string) => ServerService.pingServer(address));

  // -------------------------------------------------------------------------
  // Skins — local library plus Minecraft Services for premium accounts
  // -------------------------------------------------------------------------

  ipcMain.handle('skins-list', () => SkinService.listSkins(MinecraftPaths.getSkinsDir()));

  ipcMain.handle('skin-import-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select a Minecraft skin',
      properties: ['openFile'],
      filters: [{ name: 'Minecraft Skin (PNG)', extensions: ['png'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    try {
      const skin = await SkinService.importSkinFromFile(MinecraftPaths.getSkinsDir(), result.filePaths[0]);
      return { success: true, skin };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('skin-import-url', async (_event, url: string) => {
    try {
      const skin = await SkinService.importSkinFromUrl(MinecraftPaths.getSkinsDir(), url);
      return { success: true, skin };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('skin-delete', (_event, id: string) => SkinService.deleteSkin(MinecraftPaths.getSkinsDir(), id));

  /**
   * Resolves a fresh Minecraft access token for the active Microsoft account:
   * hydrates it from the encrypted store and silently refreshes when expired.
   */
  async function resolvePremiumToken(): Promise<{ token: string } | { error: string }> {
    const settings = SettingsService.getSettings();
    const account = (settings.richAccounts || []).find((a) => a.name === settings.activeAccount);
    if (!account || account.type !== 'microsoft') {
      return { error: 'This action needs a signed-in Microsoft account.' };
    }

    const store = getSecureTokenStore();
    const hydrated = hydrateAccount(account, store?.getTokens(account.name));
    if (!hydrated.accessToken && !hydrated.refreshToken) {
      return { error: 'No stored session for this account. Sign in with Microsoft again.' };
    }

    if (hydrated.accessToken && hydrated.expiresAt && Date.now() < hydrated.expiresAt) {
      return { token: hydrated.accessToken };
    }

    const refreshed = await MicrosoftAuthService.refreshAccount(hydrated);
    store?.setTokens(refreshed.name, {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    });
    // Persist any profile changes (name/uuid); saveSettings strips the tokens.
    SettingsService.saveSettings({
      ...settings,
      richAccounts: (settings.richAccounts || []).map((a) => (a.name === account.name ? refreshed : a)),
    });
    if (!refreshed.accessToken) {
      return { error: 'Microsoft did not return a usable session token. Sign in again.' };
    }
    return { token: refreshed.accessToken };
  }

  /** Applies a library skin to the active account via Mojang. */
  ipcMain.handle('skin-apply', async (_event, skinId: string, model: 'classic' | 'slim') => {
    try {
      const resolved = await resolvePremiumToken();
      if ('error' in resolved) {
        return {
          success: false,
          error: `${resolved.error} The skin stays saved in your local library.`,
        };
      }
      await SkinService.applySkinToAccount(resolved.token, MinecraftPaths.getSkinsDir(), skinId, model);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  /** Pulls the account's currently-worn skin down into the local library. */
  ipcMain.handle('skin-import-active-account', async () => {
    try {
      const resolved = await resolvePremiumToken();
      if ('error' in resolved) {
        return { success: false, error: resolved.error };
      }
      const skin = await SkinService.importActiveAccountSkin(resolved.token, MinecraftPaths.getSkinsDir());
      return skin
        ? { success: true, skin }
        : { success: false, error: 'That account is using the default Minecraft skin.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // -------------------------------------------------------------------------
  // OS integration
  // -------------------------------------------------------------------------

  /** Opens an instance's game directory (or the launcher root) in the file manager. */
  ipcMain.handle('open-game-directory', async (_event, instanceId?: string) => {
    const target = instanceId ? MinecraftPaths.getInstanceDir(instanceId) : MinecraftPaths.getLauncherDataDir();
    const error = await shell.openPath(target);
    return error ? { success: false, error } : { success: true, path: target };
  });

  ipcMain.handle('open-external', async (_event, url: string) => {
    // Only ever hand real web URLs to the OS handler.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { success: false, error: 'Only http and https links can be opened.' };
      }
      await shell.openExternal(parsed.toString());
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  /** Imports a settings JSON exported from this or another launcher. */
  ipcMain.handle('import-settings-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import launcher settings',
      properties: ['openFile'],
      filters: [{ name: 'Settings (JSON)', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    try {
      const raw = await fsPromises.readFile(result.filePaths[0], 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('That file does not contain a settings object.');
      }

      // Merge over current settings so a partial export cannot blank fields out.
      const current = SettingsService.getSettings();
      const merged = { ...current, ...parsed };
      SettingsService.saveSettings(merged);
      return { success: true, settings: merged, path: result.filePaths[0] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('export-settings-file', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export launcher settings',
      defaultPath: 'gravityclient-settings.json',
      filters: [{ name: 'Settings (JSON)', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }
    try {
      await fsPromises.writeFile(result.filePath, JSON.stringify(SettingsService.getSettings(), null, 2), 'utf8');
      return { success: true, path: result.filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}

// Low level helpers to avoid circular import issues
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
function fsExists(p: string): boolean {
  return fs.existsSync(p);
}
function fsRead(p: string): string {
  return fs.readFileSync(p, 'utf8');
}
