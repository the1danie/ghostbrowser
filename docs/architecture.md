# GhostBrowser — Архитектура

## Обзор

GhostBrowser — open-source antidetect browser (аналог Dolphin Anty).
Стек: **Electron + React + TypeScript + Tailwind CSS + Supabase + Playwright**.

## Слои приложения

```
┌─────────────────────────────────────────┐
│           React UI (Renderer)           │
│  Pages → Components → Hooks → Supabase  │
├─────────────────────────────────────────┤
│              IPC Bridge                 │
│         preload.ts (contextBridge)      │
├─────────────────────────────────────────┤
│        Electron Main Process            │
│  main.ts → BrowserManager → Playwright  │
├─────────────────────────────────────────┤
│            Core Libraries               │
│  fingerprint-generator/injector         │
│  cookie-warmer, proxy-checker           │
│  human-emulator                         │
├─────────────────────────────────────────┤
│         Supabase (Backend)              │
│  Auth, PostgreSQL (RLS), Storage        │
└─────────────────────────────────────────┘
```

## Процессы Electron

### Main Process (`electron/`)
- `main.ts` — создание окна, регистрация IPC-хендлеров
- `browser-manager.ts` — управление Playwright-браузерами: запуск, остановка, cookie warming, proxy check
- `preload.ts` — `contextBridge.exposeInMainWorld('electronAPI', ...)` — безопасный мост между main и renderer

### Renderer Process (`src/`)
- React SPA с роутингом (`react-router-dom`)
- Все взаимодействие с Electron через `window.electronAPI`
- Все CRUD-операции с данными через Supabase JS client напрямую из renderer

## Потоки данных

### Запуск профиля
```
UI (DashboardPage) → window.electronAPI.launchProfile(profileData)
  → IPC → main.ts → BrowserManager.launchProfile()
    → chromium.launch() с proxy
    → browser.newContext() с userAgent, viewport, locale, timezone
    → context.addInitScript(fingerprintInjectionScript)
    → context.addCookies(savedCookies)
    → page.goto('about:blank')
  ← возвращает { pid }
```

### Остановка профиля
```
UI → electronAPI.closeProfile(id)
  → BrowserManager.closeProfile()
    → context.storageState() → сохраняет в файл
    → context.cookies() → возвращает cookies
    → browser.close()
  ← возвращает cookies → UI сохраняет в Supabase
```

### Cookie Warming
```
UI (CookieWarmerModal) → electronAPI.warmCookies(config)
  → BrowserManager.warmCookies()
    → Для каждого URL:
      → page = context.newPage()
      → page.goto(url)
      → humanEmulation: scroll, mouse.move, click links
      → page.close()
    → context.storageState() → сохраняет
  ← progress events через mainWindow.webContents.send()
```

## Изоляция профилей

Каждый профиль получает свою директорию:
```
{userData}/browser-profiles/{profile-uuid}/
  └── state.json  — Playwright storageState (cookies + localStorage)
```

Playwright `storageState` автоматически восстанавливает cookies и localStorage при следующем запуске.

## Fingerprint Injection

Инъекция происходит через `context.addInitScript()` **до** загрузки любой страницы.

Переопределяемые API:
| API | Метод переопределения |
|-----|----------------------|
| `navigator.userAgent`, `platform`, `language`, etc. | `Object.defineProperty(Navigator.prototype, ...)` |
| `screen.width/height` | `Object.defineProperty(Screen.prototype, ...)` |
| WebGL vendor/renderer | Перехват `getParameter(UNMASKED_VENDOR/RENDERER)` |
| Canvas fingerprint | Перехват `toDataURL()` / `toBlob()` с добавлением шума |
| AudioContext | Перехват `getChannelData()` с добавлением шума |
| WebRTC | Удаление `RTCPeerConnection` при policy=disable |
| Timezone | Перехват `Intl.DateTimeFormat.resolvedOptions()` + `getTimezoneOffset()` |
| Plugins | Подмена `navigator.plugins` |
| Battery API | Подмена `navigator.getBattery()` |
| Fonts | Шум в `measureText().width` |
