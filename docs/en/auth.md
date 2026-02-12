# Authentication

GhostBrowser uses **Supabase Auth**.

Supported flows:
- Email/password
- OAuth (Google, GitHub)

## Supabase provider setup

1. Go to **Authentication -> Providers**.
2. Enable Google and/or GitHub.
3. Add provider credentials (client id/secret).

## Redirect URLs

In **Authentication -> URL Configuration**, add:
- `http://localhost:5173/login`
- `https://your-domain.com/login` (for web deployments)

For packaged desktop builds, OAuth callback uses deep-link scheme:
- `ghostbrowser://auth/callback`

## App behavior

- Login/Register pages support OAuth buttons.
- In web/dev mode, redirect happens inside browser window.
- In packaged desktop mode, system browser opens and returns tokens via deep link.

## RLS impact

Data access is protected by Supabase RLS in `profiles` and `proxies` tables.
Users only see/manage their own records.

