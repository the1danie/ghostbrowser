# GhostBrowser Fingerprint Engine

## Overview

Fingerprint subsystem consists of two core modules:

1. `src/lib/fingerprint-generator.ts`
2. `src/lib/fingerprint-injector.ts`

## Generator

Main functions:

- `generateFingerprint(overrides?)`
- `generateFingerprintForProxy(proxyCountry?, overrides?)`

Generated values include:
- user-agent
- screen resolution
- WebGL vendor/renderer
- timezone/locale/language
- CPU cores, device memory
- platform
- DNT flag
- canvas/audio noise
- WebRTC policy
- fonts list

Geo presets are mapped in `GEO_PRESETS` and include countries/timezones/languages.

## Editor integration

`src/components/FingerprintEditor.tsx` allows manual selection of:
- Geo
- Timezone
- Language
- Platform
- WebRTC
- DNT
- Advanced parameters

## Injector

`generateInjectionScript(fp)` produces a JS payload injected via `context.addInitScript()`.

It overrides browser APIs before page scripts run.

Main patched areas:
- `navigator.*`
- `screen.*`
- WebGL fingerprint params
- canvas/audio signal noise
- WebRTC controls
- timezone/locale hooks
- plugins and battery values
- font measurement noise

## Notes

- Fingerprint is stored in Supabase JSONB (`profiles.fingerprint`).
- Injection runs per-browser-context, per profile.

