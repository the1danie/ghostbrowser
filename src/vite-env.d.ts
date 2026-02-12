/// <reference types="vite/client" />

interface ElectronAPI {
  launchProfile: (profileData: any) => Promise<{ success: boolean; pid?: number; error?: string }>;
  closeProfile: (profileId: string) => Promise<{ success: boolean; cookies?: any[]; error?: string }>;
  getRunningProfiles: () => Promise<{ profileId: string; pid: number; startedAt: number }[]>;
  warmCookies: (config: any) => Promise<{ success: boolean; error?: string }>;
  stopWarming: (profileId: string) => Promise<{ success: boolean }>;
  onWarmingProgress: (callback: (progress: any) => void) => () => void;
  onProfileClosed: (callback: (data: { profileId: string; cookies: any[] }) => void) => () => void;
  checkProxy: (proxyData: any) => Promise<any>;
  getUserDataPath: () => Promise<string>;
  deleteProfileData: (profileId: string) => Promise<{ success: boolean; error?: string }>;
  cleanupOrphanProfileData: (keepProfileIds: string[]) => Promise<{ success: boolean; removed: string[]; error?: string }>;
  openExternal: (url: string) => Promise<void>;
  onAuthCallback: (callback: (tokens: { access_token: string; refresh_token: string }) => void) => () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
