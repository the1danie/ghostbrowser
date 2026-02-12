# GhostBrowser Architecture

## Overview

GhostBrowser is an open-source antidetect browser and a **clone of Dolphin Anty**.

Stack: **Electron + React + TypeScript + Tailwind CSS + Supabase + Playwright**.

## High-level layers

```
┌─────────────────────────────────────────┐
│           React UI (Renderer)           │
│   Pages -> Components -> Hooks -> API   │
├─────────────────────────────────────────┤
│              IPC Bridge                 │
│         preload.ts (contextBridge)      │
├─────────────────────────────────────────┤
│        Electron Main Process            │
│  main.ts -> BrowserManager -> Playwright│
├─────────────────────────────────────────┤
│            Core Libraries               │
│  fingerprint-generator/injector         │
│  cookie-warmer, proxy-checker           │
├─────────────────────────────────────────┤
│         Supabase (Backend)              │
│    Auth, PostgreSQL (RLS), storage      │
└─────────────────────────────────────────┘
```

## Electron processes

### Main process (`electron/`)
- `main.ts` — app lifecycle, window creation, IPC handlers, deep-link auth callback.
- `browser-manager.ts` — Playwright profile launch/stop, cookie warming, proxy checks.
- `preload.ts` — secure API exposure through `contextBridge`.

### Renderer process (`src/`)
- React SPA (`react-router-dom`).
- Uses `window.electronAPI` for desktop actions.
- Uses Supabase client for data/auth operations.

## Main data flows

### Profile launch
```
Dashboard -> electronAPI.launchProfile(profileData)
  -> IPC -> BrowserManager.launchProfile()
    -> launch persistent context with proxy/fingerprint
    -> inject anti-fingerprint script
    -> restore cookies
```

### Profile stop
```
electronAPI.closeProfile(id)
  -> BrowserManager.closeProfile()
    -> save storage state
    -> collect cookies
    -> close context
```

### Cookie warming
```
CookieWarmerModal -> electronAPI.warmCookies(config)
  -> BrowserManager.warmCookies()
    -> visit target URLs
    -> optional human emulation
    -> save state and report progress
```

## Profile isolation

Each profile uses its own local folder:

```
{userData}/browser-profiles/{profile-id}/
  └── state.json
```

This keeps cookies/localStorage isolated per profile.

## Fingerprint injection

Injection is added before page load via `context.addInitScript()`.

Main overridden APIs:
- `navigator.userAgent`, `platform`, `language`, etc.
- `screen.width/height`
- WebGL vendor/renderer
- Canvas/audio noise hooks
- WebRTC policy controls
- timezone/locale methods
- plugin and battery API values

