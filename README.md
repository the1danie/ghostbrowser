# GhostBrowser

GhostBrowser — open-source antidetect browser на `Electron + React + Supabase + Playwright`.

Проект позволяет:
- управлять множеством браузерных профилей;
- задавать/генерировать fingerprint (UA, платформа, гео, timezone, language, WebRTC и т.д.);
- привязывать прокси к профилям;
- запускать изолированные persistent-сессии;
- прогревать cookie (Cookie Warmer);
- импортировать/экспортировать профили JSON.

---

## Что внутри

- **Desktop shell:** Electron
- **UI:** React + TypeScript + Tailwind
- **Backend:** Supabase (Auth + Postgres + RLS)
- **Browser automation:** Playwright (Chromium)

---

## Быстрый старт (с нуля после `git clone`)

### 1. Требования

Нужно установить:
- Node.js **18+** (рекомендуется LTS 20)
- npm **9+**
- Git
- аккаунт в Supabase

Проверка:

```bash
node -v
npm -v
```

### 2. Клонирование и установка зависимостей

```bash
git clone <YOUR_REPO_URL>
cd ghostbrowser
npm ci
```

Если `npm ci` недоступен (нет lock compatibility), можно:

```bash
npm install
```

### 3. Настройка Supabase (обязательно)

1. Создай новый проект в Supabase.
2. Открой **SQL Editor**.
3. Выполни SQL из файла:
   - `supabase/migrations/001_initial.sql`
4. В Supabase открой **Project Settings -> API** и скопируй:
   - `Project URL`
   - `anon public key`

### 4. Настройка `.env`

Скопируй пример:

```bash
cp .env.example .env
```

Заполни свои значения:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 5. Запуск в dev-режиме (Electron + UI)

```bash
npm run electron:dev
```

После запуска:
- зарегистрируй аккаунт (или войди);
- создай прокси;
- создай профиль;
- запусти профиль.

---

## Подробная настройка Auth (Supabase)

### Email/Password

Работает сразу после создания проекта.

### OAuth (Google/GitHub)

Если нужен OAuth:

1. **Supabase -> Authentication -> Providers**: включить Google/GitHub, добавить client id/secret.
2. **Supabase -> Authentication -> URL Configuration**: добавить Redirect URLs:
   - `http://localhost:5173/login`
   - `https://your-domain.com/login` (если есть web-deploy)

Важно: в desktop production (когда app загружается из `file://`) OAuth redirect обычно требует отдельной схемы deep-link и доп. конфигурации. Базовый сценарий в этом репозитории рассчитан на `localhost`/web URL.

---

## Как пользоваться приложением

### 1) Proxy Manager

`Proxies` -> `Add Proxy`:
- поддержка `http/https/socks4/socks5`;
- поддержка auth (`username/password`);
- есть `Check Proxy`;
- при проверке автозаполняются `country/city`;
- прокси можно редактировать.

Также есть `Bulk Import`:
- `protocol://user:pass@host:port`
- `host:port:user:pass`
- `host:port`

### 2) Browser Profiles

`Profiles` -> `New Profile`:
- базовые поля: name/group/tags/status/notes;
- выбор прокси (или `No Proxy`);
- fingerprint editor:
  - Geo (включая `Kazakhstan`),
  - Timezone,
  - Language,
  - CPU/Memory,
  - WebRTC,
  - DNT,
  - Advanced (canvas/audio noise, fonts, webgl).

### 3) Запуск профиля

На карточке профиля:
- `Play` — запуск браузерной сессии;
- `Stop` — остановка и сохранение cookie;
- `Warm Cookies` — прогрев сайтов;
- `Duplicate`, `Edit`, `Delete`.

Если у профиля указан прокси, запуск идет через этот прокси. Перед запуском выполняется проверка доступности прокси.

### 4) Cookie Warmer

Можно выбрать:
- категории сайтов;
- custom URLs;
- диапазон времени на сайт;
- число кликов;
- human emulation.

Если профиль уже запущен с нужным прокси, warmer использует текущий контекст. Если нужен другой прокси, поднимается отдельный warming browser через указанный прокси.

### 5) Settings

Раздел `Settings` содержит:
- текущий email и user id;
- путь локального хранилища профилей;
- кнопку очистки orphan-папок (`Cleanup Orphans`).

---

## Где хранятся данные

- Серверные данные (profiles/proxies/auth): **Supabase**.
- Локальные профили браузера (cookies/cache/storage):
  - `{Electron userData}/browser-profiles/<profile-id>/`

Путь можно посмотреть в `Settings`.

---

## Сборка production приложения

### 1. Подготовить иконку (опционально, но рекомендуется)

```bash
npm run assets:icons
```

Скрипт создаст:
- `build/icon.png`

### 2. Собрать приложение

```bash
npm run electron:build
```

Артефакты будут в папке:
- `release/`

Типы таргетов в текущем конфиге:
- macOS: `dmg`
- Windows: `nsis`
- Linux: `AppImage`

Важно: код-сигнинг/notarization в этом репозитории не настроены автоматически.

---

## Полезные команды

```bash
npm run dev            # только Vite (UI)
npm run electron:dev   # Vite + Electron
npm run build          # сборка фронта + electron ts
npm run electron:build # production package
npm run assets:icons   # генерация brand icon
```

---

## Диагностика проблем

### Бесконечная загрузка в браузерной сессии

Почти всегда причина в прокси.
Проверь:
- `Proxies -> Check`;
- корректность protocol (`http` vs `https`);
- что прокси реально поддерживает HTTPS-трафик и авторизацию;
- что нет rate-limit/банов у провайдера прокси.

### `Electron API not available`

Означает, что приложение открыто как web-only Vite без Electron preload. Запускай через:

```bash
npm run electron:dev
```

### Ошибки Supabase / пустые таблицы

Проверь:
- выполнен ли `supabase/migrations/001_initial.sql`;
- верные ли `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`;
- включены ли RLS policy (они создаются миграцией).

### Playwright не запускает Chromium

Если не скачался browser runtime:

```bash
npx playwright install chromium
```

---

## Структура документации

- `docs/architecture.md` — архитектура
- `docs/project-structure.md` — структура проекта
- `docs/database.md` — БД и RLS
- `docs/electron-ipc.md` — IPC API
- `docs/fingerprint-engine.md` — fingerprint engine
- `docs/auth.md` — auth/OAuth
- `docs/deploy-frontend.md` — deploy web frontend
- `docs/coding-conventions.md` — кодстайл

---

## Минимальный чеклист для нового разработчика

1. `npm ci`
2. создать Supabase-проект
3. выполнить `supabase/migrations/001_initial.sql`
4. заполнить `.env`
5. `npm run electron:dev`
6. создать тестовый proxy и профиль
7. запустить профиль и убедиться, что трафик идет через прокси
