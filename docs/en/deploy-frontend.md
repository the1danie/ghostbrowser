# Frontend Deployment

This project can be deployed as static SPA frontend (`dist/`) for web usage.

## Build

```bash
npm ci
npm run build
```

Build output:
- `dist/`

Required env vars at build time:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deployment options

### Vercel

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Add required env vars in project settings.

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add required env vars.
- Add SPA redirect rule:
  - `/* /index.html 200`

### Nginx (self-hosted)

Example location config for SPA fallback:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Important

This repository's primary target is desktop Electron app.
Web deployment is optional and mostly useful for UI/backend testing.

