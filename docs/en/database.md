# GhostBrowser Database (Supabase)

## Overview

The app uses Supabase Postgres with Row-Level Security.

Main tables:
- `proxies`
- `profiles`

Schema source: `supabase/migrations/001_initial.sql`

## `proxies` table

Key fields:
- `id` (uuid, PK)
- `user_id` (FK to `auth.users`)
- `protocol` (`http|https|socks4|socks5`)
- `host`, `port`
- `username`, `password`
- `country`, `city`
- `is_valid`, `last_checked_at`

## `profiles` table

Key fields:
- `id` (uuid, PK)
- `user_id` (FK to `auth.users`)
- `name`
- `status` (`new|active|running|blocked`)
- `group_name`, `tags`
- `fingerprint` (jsonb)
- `proxy_id` (FK to `proxies`)
- `cookies` (jsonb)
- `notes`
- `user_data_path`
- `created_at`, `updated_at`

## Fingerprint JSON schema

Stored in `profiles.fingerprint`.

Includes fields such as:
- userAgent
- screenResolution
- webglVendor / webglRenderer
- timezone / locale / language
- hardwareConcurrency
- deviceMemory
- platform
- doNotTrack
- canvasNoise / audioNoise
- webrtcPolicy
- fonts

## RLS

Both tables have RLS enabled.

Policies enforce:
- users can read/write only their own rows (`auth.uid() = user_id`).

## Indexes and trigger

Indexes exist on commonly queried fields (`user_id`, `status`, `group_name`).

`profiles.updated_at` is automatically updated by trigger on update.

## Access pattern in code

Supabase client is initialized in `src/lib/supabase.ts`.

Hooks used for CRUD:
- `src/hooks/useProfiles.ts`
- `src/hooks/useProxies.ts`
- `src/hooks/useAuth.ts`

