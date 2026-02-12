# GhostBrowser — Electron IPC API

## Архитектура

```
Renderer (React)
  ↓ window.electronAPI.method()
Preload (contextBridge)
  ↓ ipcRenderer.invoke('channel', args)
Main Process (ipcMain.handle)
  ↓ BrowserManager / system calls
  ↑ return result
```

Вся коммуникация — через `ipcRenderer.invoke()` / `ipcMain.handle()` (request-response паттерн).
Исключение: `warming:progress` — push от main к renderer через `webContents.send()`.

## API Reference

### Browser Profile Management

#### `electronAPI.launchProfile(profileData)`
Запускает браузер для профиля.

**Input:**
```typescript
{
  id: string;                    // UUID профиля
  fingerprint: BrowserFingerprint;
  proxy?: {                      // опционально
    protocol: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  cookies?: any[];               // сохранённые cookies
}
```

**Output:**
```typescript
{ success: true, pid: number }
// или
{ success: false, error: string }
```

**IPC channel:** `browser:launch`

---

#### `electronAPI.closeProfile(profileId)`
Останавливает браузер, сохраняет state и cookies.

**Input:** `profileId: string`

**Output:**
```typescript
{ success: true, cookies: Cookie[] }
// или
{ success: false, error: string }
```

**IPC channel:** `browser:close`

---

#### `electronAPI.getRunningProfiles()`
Возвращает список запущенных профилей.

**Output:**
```typescript
Array<{ profileId: string; pid: number; startedAt: number }>
```

**IPC channel:** `browser:running`

---

### Cookie Warming

#### `electronAPI.warmCookies(config)`
Запускает прогрев cookies для профиля.

**Input:**
```typescript
{
  profileId: string;
  urls: string[];
  minTimePerSite: number;   // секунды
  maxTimePerSite: number;
  maxClicks: number;
  humanEmulation: boolean;
}
```

**Output:** `{ success: true }` или `{ success: false, error: string }`

**IPC channel:** `browser:warm-cookies`

---

#### `electronAPI.stopWarming(profileId)`
Останавливает прогрев.

**IPC channel:** `browser:stop-warming`

---

#### `electronAPI.onWarmingProgress(callback)`
Подписка на прогресс прогрева (push от main process).

**Callback data:**
```typescript
{
  currentUrl: string;
  currentIndex: number;
  totalUrls: number;
  status: 'running' | 'done' | 'error' | 'stopped';
  error?: string;
}
```

**Возвращает:** функцию для отписки `() => void`

**IPC channel:** `warming:progress` (webContents.send)

---

### Proxy

#### `electronAPI.checkProxy(proxyData)`
Проверяет прокси через Playwright: запускает headless браузер, получает IP, определяет геолокацию.

**Input:**
```typescript
{
  protocol: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
}
```

**Output:**
```typescript
{
  isValid: boolean;
  ip: string | null;
  country: string | null;
  city: string | null;
  latencyMs: number | null;
  error: string | null;
}
```

**IPC channel:** `proxy:check`

---

### Utilities

#### `electronAPI.getUserDataPath()`
Возвращает путь к директории `browser-profiles/`.

**IPC channel:** `get-user-data-path`

---

#### `electronAPI.openExternal(url)`
Открывает URL в системном браузере.

**IPC channel:** `shell:open-external`

---

## Добавление нового IPC метода

1. **Main process** (`electron/main.ts`):
```typescript
ipcMain.handle('my:channel', async (_event, arg1, arg2) => {
  // логика
  return { success: true, data: result };
});
```

2. **Preload** (`electron/preload.ts`):
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // ...existing methods
  myMethod: (arg1, arg2) => ipcRenderer.invoke('my:channel', arg1, arg2),
});
```

3. **TypeScript типы** (`src/vite-env.d.ts`):
```typescript
interface ElectronAPI {
  // ...existing methods
  myMethod: (arg1: Type1, arg2: Type2) => Promise<ResultType>;
}
```

4. **Использование в React**:
```typescript
const result = await (window as any).electronAPI.myMethod(arg1, arg2);
```
