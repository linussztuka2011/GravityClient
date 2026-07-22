import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gravityAPI', {
  // Global settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Profiles management
  getInstances: () => ipcRenderer.invoke('get-instances'),
  createInstance: (name: string, mcVersion: string) => ipcRenderer.invoke('create-instance', name, mcVersion),
  updateInstance: (config: any) => ipcRenderer.invoke('update-instance', config),
  deleteInstance: (id: string) => ipcRenderer.invoke('delete-instance', id),

  // Modpack Metadata
  getPackManifest: () => ipcRenderer.invoke('get-pack-manifest'),

  // Installation
  installPack: (config: any) => ipcRenderer.invoke('install-pack', config),

  // Game Launch
  launchGame: (instanceId: string) => ipcRenderer.invoke('launch-game', instanceId),

  // Microsoft OAuth Auth Flow
  startMicrosoftLogin: () => ipcRenderer.invoke('microsoft-login-start'),
  pollMicrosoftLogin: (deviceCode: string, interval: number) => ipcRenderer.invoke('microsoft-login-poll', deviceCode, interval),
  stopMicrosoftLogin: () => ipcRenderer.invoke('microsoft-login-stop'),
  onMicrosoftLoginStatus: (callback: (data: { status: 'WAITING' | 'SUCCESS' | 'EXPIRED' | 'ERROR'; details?: any }) => void) => {
    const channel = 'microsoft-login-status';
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },

  // Installation Events (Logs and Progress)
  onPackInstallProgress: (instanceId: string, callback: (data: any) => void) => {
    const channel = `pack-install-progress-${instanceId}`;
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },

  onPackInstallLog: (instanceId: string, callback: (data: any) => void) => {
    const channel = `pack-install-log-${instanceId}`;
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },

  // Modrinth Search and Install
  modrinthSearch: (query: string, mcVersion?: string) => ipcRenderer.invoke('modrinth-search', query, mcVersion),
  modrinthInstall: (instanceId: string, projectId: string, mcVersion?: string) => ipcRenderer.invoke('modrinth-install', instanceId, projectId, mcVersion),
  onModrinthInstallProgress: (instanceId: string, projectId: string, callback: (percent: number) => void) => {
    const channel = `modrinth-install-progress-${instanceId}-${projectId}`;
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  }
});
