import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { BrowserManager } from './browser-manager';

let mainWindow: BrowserWindow | null = null;
const browserManager = new BrowserManager();
const APP_NAME = 'NebulaBrowse';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: '#0d0f17',
    titleBarStyle: 'hiddenInset',
    title: APP_NAME,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Start app maximized so workspace fills the screen immediately
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  app.setName(APP_NAME);
  createWindow();

  // When user manually closes a browser window, push event to renderer
  browserManager.setOnProfileClosed((profileId, cookies) => {
    mainWindow?.webContents.send('browser:closed', { profileId, cookies });
  });
});

app.on('window-all-closed', () => {
  browserManager.closeAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC Handlers ---

// Launch a browser profile
ipcMain.handle('browser:launch', async (_event, profileData: any) => {
  try {
    const result = await browserManager.launchProfile(profileData);
    return { success: true, pid: result.pid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Close a browser profile
ipcMain.handle('browser:close', async (_event, profileId: string) => {
  try {
    const cookies = await browserManager.closeProfile(profileId);
    return { success: true, cookies };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Get running profiles
ipcMain.handle('browser:running', () => {
  return browserManager.getRunningProfiles();
});

// Cookie warming
ipcMain.handle('browser:warm-cookies', async (_event, config: any) => {
  try {
    await browserManager.warmCookies(config, (progress) => {
      mainWindow?.webContents.send('warming:progress', progress);
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Stop cookie warming
ipcMain.handle('browser:stop-warming', async (_event, profileId: string) => {
  browserManager.stopWarming(profileId);
  return { success: true };
});

// Check proxy
ipcMain.handle('proxy:check', async (_event, proxyData: any) => {
  try {
    const result = await browserManager.checkProxy(proxyData);
    return result;
  } catch (error: any) {
    return { isValid: false, ip: null, country: null, city: null, latencyMs: null, error: error.message };
  }
});

// Get user data dir path
ipcMain.handle('get-user-data-path', () => {
  return path.join(app.getPath('userData'), 'browser-profiles');
});

// Delete local profile data directory
ipcMain.handle('browser:delete-profile-data', async (_event, profileId: string) => {
  try {
    await browserManager.deleteProfileData(profileId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Remove local profile directories that are no longer present in DB
ipcMain.handle('browser:cleanup-orphan-profile-data', async (_event, keepProfileIds: string[]) => {
  try {
    const result = browserManager.cleanupOrphanProfileData(keepProfileIds || []);
    return { success: true, removed: result.removed };
  } catch (error: any) {
    return { success: false, error: error.message, removed: [] };
  }
});

// Open external URL
ipcMain.handle('shell:open-external', (_event, url: string) => {
  shell.openExternal(url);
});
