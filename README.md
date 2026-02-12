# GhostBrowser

Open-source antidetect browser built with **Electron + React + Supabase + Playwright**.

## Features

- Manage multiple isolated browser profiles
- Generate and customize fingerprints (UA, platform, geo, timezone, language, WebGL, Canvas, Audio, WebRTC, etc.)
- Bind proxies to profiles (HTTP/HTTPS/SOCKS4/SOCKS5 with auth)
- Launch persistent browser sessions with stealth CDP mode (system Chrome, no automation flags)
- Cookie Warmer with human emulation (scrolling, clicking, random delays)
- Import/export profiles as JSON
- Bulk proxy import

## Author

- **Daniyal Abuov** ([@the1danie](https://github.com/the1danie))
- Contact: **bombuuk@gmail.com**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| UI | React + TypeScript + Tailwind CSS |
| Backend | Supabase (Auth + Postgres + RLS) |
| Browser automation | Playwright / rebrowser-playwright (Chromium) |

---

## Quick Start

### Prerequisites

- Node.js **18+** (LTS 20 recommended)
- npm **9+**
- Git
- Supabase account

### 1. Clone and install

```bash
git clone https://github.com/the1danie/ghostbrowser.git
cd ghostbrowser
npm install
```

### 2. Set up Supabase

1. Create a new project in [Supabase](https://supabase.com).
2. Open **SQL Editor** and run the migration:
   - `supabase/migrations/001_initial.sql`
3. Go to **Project Settings > API** and copy:
   - `Project URL`
   - `anon public key`

### 3. Configure `.env`

```bash
cp .env.example .env
```

Fill in your values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 4. Run in development mode

```bash
npm run electron:dev
```

After launch: register an account, add a proxy, create a profile, and start it.

---

## Usage

### Proxy Manager

`Proxies` > `Add Proxy`:
- Supports `http/https/socks4/socks5` with optional username/password auth
- `Check Proxy` auto-fills country/city via GeoIP
- Bulk import formats: `protocol://user:pass@host:port`, `host:port:user:pass`, `host:port`

### Browser Profiles

`Profiles` > `New Profile`:
- Name, group, tags, status, notes
- Proxy selection (or no proxy)
- Fingerprint editor: Geo, Timezone, Language, CPU/Memory, WebRTC, DNT, Canvas/Audio noise, WebGL, Fonts

### Launching a Profile

- **Play** — start a browser session (stealth CDP mode using system Chrome)
- **Stop** — close and save cookies
- **Warm Cookies** — visit sites with human-like behavior
- **Duplicate / Edit / Delete**

Proxy is verified before each launch. If unreachable, launch is blocked.

### Cookie Warmer

- Select site categories or add custom URLs
- Configure time-per-site range, max clicks, human emulation
- Uses the running profile context when possible, or launches a dedicated browser

### Settings

- Current user email and ID
- Local profile storage path
- Cleanup orphan profile data

---

## Data Storage

| Data | Location |
|------|----------|
| Profiles, proxies, auth | Supabase (cloud) |
| Browser data (cookies, cache, localStorage) | `{Electron userData}/browser-profiles/<profile-id>/` |

Check the path in **Settings**.

---

## Building for Production

### Generate app icon (optional)

```bash
npm run assets:icons
```

### Build

```bash
npm run electron:build
```

Output goes to `release/`. Targets:
- macOS: `dmg`
- Windows: `nsis`
- Linux: `AppImage`

---

## Useful Commands

```bash
npm run dev              # Vite UI only
npm run electron:dev     # Vite + Electron (development)
npm run build            # Build frontend + Electron TypeScript
npm run electron:build   # Production package
npm run assets:icons     # Generate brand icon
```

---

## Troubleshooting

### Browser session hangs / infinite loading

Almost always a proxy issue. Check:
- `Proxies` > `Check` — is the proxy alive?
- Correct protocol (`http` vs `https`)
- Proxy supports HTTPS traffic and your auth credentials
- No rate-limits or bans from the proxy provider

### `Electron API not available`

The app was opened as a web-only Vite dev server without Electron preload. Run via:

```bash
npm run electron:dev
```

### Supabase errors / empty tables

- Ensure `supabase/migrations/001_initial.sql` was executed
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- RLS policies are created by the migration

### Playwright can't launch Chromium

```bash
npx playwright install chromium
```

---

## Project Structure

See `docs/` for detailed documentation:
- `docs/architecture.md` — Architecture overview
- `docs/project-structure.md` — File structure
- `docs/database.md` — Database and RLS policies
- `docs/electron-ipc.md` — IPC API
- `docs/fingerprint-engine.md` — Fingerprint engine
- `docs/auth.md` — Authentication / OAuth
- `docs/deploy-frontend.md` — Deploy web frontend
- `docs/coding-conventions.md` — Coding style

---

## License

MIT
