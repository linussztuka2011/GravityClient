import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gravityAPI', {
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
  }
});
