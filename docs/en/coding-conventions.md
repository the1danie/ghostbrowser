# Coding Conventions

## General

- Language: TypeScript
- Prefer strict typing
- Avoid `any` unless integration boundaries require it (IPC/JSON payloads)
- Keep components/hooks pragmatic and readable

## Naming

- Components: `PascalCase` (`ProfileCard.tsx`)
- Utility files: `kebab-case` (`fingerprint-generator.ts`)
- Hooks: `useXxx` (`useProfiles.ts`)
- Interfaces/types: `PascalCase`
- Functions/variables: `camelCase`

## React

- Use functional components
- Keep one main exported component per file
- Keep event handlers with `handle*` naming
- Wrap async actions in `try/catch`

## Hooks

- Return state + actions from hooks
- Handle loading flags
- Keep Supabase CRUD logic inside hooks where possible

## Supabase

- Initialize client once in `src/lib/supabase.ts`
- Always include `user_id` for inserts
- Use `.select()` after `insert`/`update` where needed

## Electron IPC

- Use namespaced channels (`browser:*`, `proxy:*`, `shell:*`)
- Keep preload thin (bridge only, no business logic)
- Return structured result objects (`success`, `error`)

## Styling

- Tailwind utility classes + shared component classes from `src/index.css`
- Keep visual language consistent with dark theme

## Error handling

- Renderer: show user-safe error messages via toast
- Main process: catch errors and return explicit error payloads

