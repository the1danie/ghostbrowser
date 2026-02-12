# GhostBrowser

GhostBrowser is an open-source antidetect browser built with `Electron + React + Supabase + Playwright`.

This project is a **clone of Dolphin Anty** and provides:
- multi-profile browser management;
- realistic fingerprint generation/editing (UA, platform, geo, timezone, language, WebRTC, etc.);
- proxy assignment per profile;
- isolated persistent browser sessions;
- cookie warming workflows;
- JSON import/export of profiles.

## Authorship

- Original author: **Daniyal Abuov** (GitHub: **[@the1danie](https://github.com/the1danie)**)
- Contact: **danielsioo75@gmail.com**
- Dedicated authorship file: `AUTHORSHIP.md`

---

## Stack

- **Desktop shell:** Electron
- **UI:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase (Auth + Postgres + RLS)
- **Browser automation:** Playwright (Chromium)

---

## Quick Start (from fresh clone)

### 1. Requirements

Install:
- Node.js **18+** (LTS 20 recommended)
- npm **9+**
- Git
- Supabase account

Check:

```bash
node -v
npm -v
```

### 2. Clone and install

```bash
git clone <YOUR_REPO_URL>
cd ghostbrowser
npm ci
```

If `npm ci` is not available in your environment:

```bash
npm install
```

### 3. Supabase setup (required)

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run migration SQL from:
   - `supabase/migrations/001_initial.sql`
4. Open **Project Settings -> API** and copy:
   - `Project URL`
   - `anon public key`

### 4. Environment variables

```bash
cp .env.example .env
```

Set your values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 5. Run in dev mode (Electron + UI)

```bash
npm run electron:dev
```

Then:
- create/login user;
- add a proxy;
- create a profile;
- launch it.

---

## Auth setup (Supabase)

### Email/password

Works out of the box after Supabase project setup.

### OAuth (Google/GitHub)

If you need OAuth:

1. **Supabase -> Authentication -> Providers**: enable Google/GitHub and set client credentials.
2. **Supabase -> Authentication -> URL Configuration**: add redirects:
   - `http://localhost:5173/login`
   - `https://your-domain.com/login` (for web deployment)

For packaged desktop builds, deep-link callback is configured via `ghostbrowser://auth/callback`.

---

## How to use the app

### 1) Proxy Manager

`Proxies` -> `Add Proxy`:
- supports `http/https/socks4/socks5`;
- supports auth (`username/password`);
- includes `Check Proxy`;
- auto-fills `country/city` after successful checks;
- supports proxy editing.

Bulk import formats:
- `protocol://user:pass@host:port`
- `host:port:user:pass`
- `host:port`

### 2) Browser Profiles

`Profiles` -> `New Profile`:
- profile fields: name/group/tags/status/notes;
- proxy selection (`No Proxy` is available);
- fingerprint editor for geo/timezone/language/CPU/memory/WebRTC/DNT and advanced values.

### 3) Launching profile sessions

Profile card actions:
- `Play` launches session;
- `Stop` closes session and saves cookies;
- `Warm Cookies` opens cookie warmer;
- `Duplicate`, `Edit`, `Delete`.

If a proxy is assigned to the profile, launch traffic goes through that proxy.

### 4) Cookie Warmer

Configurable options:
- URL categories;
- custom URL list;
- min/max time per website;
- max clicks;
- human emulation.

If the profile is already running with matching proxy, warmer uses the existing context.

### 5) Settings

Includes:
- account email and user id;
- local profile storage path;
- orphan local folder cleanup (`Cleanup Orphans`).

---

## Data storage

- Server-side data (profiles/proxies/auth): **Supabase**
- Local browser storage (cookies/cache/storage):
  - `{Electron userData}/browser-profiles/<profile-id>/`

---

## Production build

### 1. Generate app icon (optional, recommended)

```bash
npm run assets:icons
```

Creates:
- `build/icon.png`

### 2. Build desktop app

```bash
npm run electron:build
```

Artifacts are generated in:
- `release/`

Current targets:
- macOS: `dmg`
- Windows: `nsis`
- Linux: `AppImage`

---

## Useful scripts

```bash
npm run dev            # Vite only (UI)
npm run electron:dev   # Vite + Electron
npm run build          # production build (renderer + electron)
npm run electron:build # packaged desktop build
npm run assets:icons   # regenerate app icon
```

---

## Troubleshooting

### Infinite loading in browser window

Most often this is a proxy issue. Check:
- `Proxies -> Check`;
- protocol correctness (`http` vs `https`);
- proxy auth credentials;
- provider-side blocks/rate limits.

### `Electron API not available`

You launched web-only Vite mode instead of Electron. Use:

```bash
npm run electron:dev
```

### Supabase errors / empty data

Check:
- migration `supabase/migrations/001_initial.sql` was applied;
- `.env` values are correct;
- RLS policies are present.

### Playwright Chromium missing

Install browser runtime manually:

```bash
npx playwright install chromium
```

---

## Documentation map

- English docs index: `docs/en/README.md`
- Russian docs index: `docs/README.md`

