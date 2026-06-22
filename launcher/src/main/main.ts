import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { InstanceService } from './services/instanceService.js';
import { PackInstaller } from './services/packInstaller.js';
import { ConfigPresetService } from './services/configPresetService.js';
import { MinecraftPaths } from './services/minecraftPaths.js';

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
      preload: path.join(__dirname, '../preload/index.js'),
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

  // Launch Minecraft Simulation
  ipcMain.handle('launch-game', (_event, instanceId: string) => {
    console.log(`Spawning simulation for Minecraft instance: ${instanceId}`);
    return {
      success: true,
      message: `Minecraft instance ${instanceId} spawned successfully in background!`
    };
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
