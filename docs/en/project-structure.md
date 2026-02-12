# GhostBrowser Project Structure

## Root layout

```
ghostbrowser/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── README.md
├── README.en.md
├── AUTHORSHIP.md
├── docs/
├── electron/
├── src/
└── supabase/
```

## Electron layer (`electron/`)

- `main.ts` — app bootstrap, IPC registration, deep-link handling.
- `preload.ts` — bridges renderer to main API.
- `browser-manager.ts` — Playwright lifecycle, proxy checks, cookie warmer.

## Renderer layer (`src/`)

- `App.tsx` — routes and layout.
- `pages/` — UI pages (profiles, proxies, settings, auth).
- `components/` — reusable UI blocks.
- `hooks/` — state/data hooks (`useAuth`, `useProfiles`, `useProxies`).
- `lib/` — core modules (fingerprints, proxy parsing, cookie warmer, Supabase client).

## Database and backend

- `supabase/migrations/001_initial.sql` — schema + RLS policies.

## Build artifacts

- `dist/` — renderer build output.
- `dist-electron/` — Electron main/preload build output.
- `release/` — packaged binaries (`npm run electron:build`).

## Documentation

- `docs/` — Russian docs
- `docs/en/` — English docs

