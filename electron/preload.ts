import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Browser profile management
  launchProfile: (profileData: any) => ipcRenderer.invoke('browser:launch', profileData),
  closeProfile: (profileId: string) => ipcRenderer.invoke('browser:close', profileId),
  getRunningProfiles: () => ipcRenderer.invoke('browser:running'),

  // Cookie warming
  warmCookies: (config: any) => ipcRenderer.invoke('browser:warm-cookies', config),
  stopWarming: (profileId: string) => ipcRenderer.invoke('browser:stop-warming', profileId),
  onWarmingProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('warming:progress', handler);
    return () => ipcRenderer.removeListener('warming:progress', handler);
  },

  // Browser closed externally (user closed the window)
  onProfileClosed: (callback: (data: { profileId: string; cookies: any[] }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('browser:closed', handler);
    return () => ipcRenderer.removeListener('browser:closed', handler);
  },

  // Proxy
  checkProxy: (proxyData: any) => ipcRenderer.invoke('proxy:check', proxyData),

  // Utils
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  deleteProfileData: (profileId: string) => ipcRenderer.invoke('browser:delete-profile-data', profileId),
  cleanupOrphanProfileData: (keepProfileIds: string[]) => ipcRenderer.invoke('browser:cleanup-orphan-profile-data', keepProfileIds),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
});
