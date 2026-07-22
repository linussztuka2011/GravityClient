import { app, BrowserWindow, ipcMain } from 'electron';
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

app.whenReady().then(() => {
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

  ipcMain.handle('save-settings', (_event, settings) => {
    SettingsService.saveSettings(settings);
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
  ipcMain.handle('install-pack', async (event, instanceConfig) => {
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
        if (mainWindow) {
          mainWindow.webContents.send('microsoft-login-status', { status, details });
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
      const result = await ModrinthService.installModToInstance(instanceId, projectId, mcVersion, onProgress);
      return result;
    } catch (err: any) {
      console.error('Failed to install Modrinth mod:', err.message);
      return { success: false, error: err.message };
    }
  });
}

// Low level helpers to avoid circular import issues
import * as fs from 'fs';
function fsExists(p: string): boolean {
  return fs.existsSync(p);
}
function fsRead(p: string): string {
  return fs.readFileSync(p, 'utf8');
}
