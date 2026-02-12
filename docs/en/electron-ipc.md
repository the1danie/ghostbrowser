# GhostBrowser Electron IPC API

## IPC model

```
Renderer (React)
  -> window.electronAPI.method()
Preload (contextBridge)
  -> ipcRenderer.invoke(channel, args)
Main process
  -> ipcMain.handle(channel)
```

Progress-style events are pushed via `webContents.send(...)`.

## Browser profile methods

### `launchProfile(profileData)`
IPC: `browser:launch`

Starts a profile with fingerprint/proxy settings.

### `closeProfile(profileId)`
IPC: `browser:close`

Stops a running profile and returns cookies.

### `getRunningProfiles()`
IPC: `browser:running`

Returns currently running profile IDs/PIDs.

## Cookie warmer methods

### `warmCookies(config)`
IPC: `browser:warm-cookies`

Starts warming URLs and emits progress.

### `stopWarming(profileId)`
IPC: `browser:stop-warming`

Stops warming loop.

### `onWarmingProgress(callback)`
Event: `warming:progress`

Subscribes to progress updates.

## External close event

### `onProfileClosed(callback)`
Event: `browser:closed`

Renderer receives browser close events when user closes profile window manually.

## Proxy methods

### `checkProxy(proxyData)`
IPC: `proxy:check`

Checks connectivity/IP/geo/latency for a proxy.

## Utility methods

### `getUserDataPath()`
IPC: `get-user-data-path`

Returns local browser profile storage path.

### `deleteProfileData(profileId)`
IPC: `browser:delete-profile-data`

Deletes a profile local folder.

### `cleanupOrphanProfileData(keepProfileIds)`
IPC: `browser:cleanup-orphan-profile-data`

Deletes local folders that are not present in DB and not currently running.

### `openExternal(url)`
IPC: `shell:open-external`

Opens URL in the system browser.

## OAuth deep-link methods

### `onAuthCallback(callback)`
Event: `auth:callback`

Receives OAuth tokens from deep link `ghostbrowser://auth/callback` in packaged app mode.

