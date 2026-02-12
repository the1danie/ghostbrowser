# GhostBrowser — Структура проекта

## Дерево файлов

```
ghostbrowser/
├── package.json                 # Зависимости и скрипты
├── tsconfig.json                # TypeScript config (React/renderer)
├── tsconfig.node.json           # TypeScript config (Vite + Electron)
├── vite.config.ts               # Vite + vite-plugin-electron
├── tailwind.config.js           # Tailwind с кастомной палитрой ghost/accent
├── postcss.config.js
├── index.html                   # Entry point (dark theme body)
├── .env.example                 # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .gitignore
│
├── electron/                    # === MAIN PROCESS ===
│   ├── main.ts                  # App lifecycle, BrowserWindow, IPC handlers
│   ├── preload.ts               # contextBridge → window.electronAPI
│   └── browser-manager.ts       # Playwright: launch/close profiles, warming, proxy check
│
├── src/                         # === RENDERER PROCESS (React) ===
│   ├── main.tsx                 # ReactDOM.createRoot + BrowserRouter
│   ├── App.tsx                  # Routes: auth vs protected, AuthLayout с Sidebar
│   ├── index.css                # Tailwind imports + кастомные @layer components
│   ├── vite-env.d.ts            # Типы для ElectronAPI + Window
│   │
│   ├── lib/                     # === CORE LIBRARIES ===
│   │   ├── supabase.ts          # createClient + типы: Profile, Proxy, BrowserFingerprint
│   │   ├── fingerprint-generator.ts  # generateFingerprint(), generateFingerprintForProxy()
│   │   ├── fingerprint-injector.ts   # generateInjectionScript(fp) → JS string
│   │   ├── cookie-warmer.ts     # WARMER_CATEGORIES, getUrlsByCategories(), parsers
│   │   ├── proxy-checker.ts     # parseProxyString(), parseBulkProxies(), proxyToConnectionString()
│   │   └── human-emulator.ts    # randomMouseMove(), randomScroll(), randomClick()
│   │
│   ├── hooks/                   # === REACT HOOKS ===
│   │   ├── useAuth.ts           # signIn, signUp, signOut, resetPassword, user state
│   │   ├── useProfiles.ts       # CRUD + duplicate + import/export + bulk delete
│   │   └── useProxies.ts        # CRUD + bulkImport + checkProxy
│   │
│   ├── pages/                   # === СТРАНИЦЫ ===
│   │   ├── LoginPage.tsx        # Email/password + forgot password
│   │   ├── RegisterPage.tsx     # Регистрация с подтверждением пароля
│   │   ├── DashboardPage.tsx    # Список профилей, поиск, фильтры, bulk actions
│   │   ├── ProfileEditPage.tsx  # Создание/редактирование профиля + FingerprintEditor
│   │   ├── ProxyPage.tsx        # Таблица прокси, добавление, bulk import, проверка
│   │   └── SettingsPage.tsx     # Аккаунт, путь к профилям, about
│   │
│   └── components/              # === КОМПОНЕНТЫ ===
│       ├── Sidebar.tsx          # Навигация + user email + sign out
│       ├── ProfileCard.tsx      # Карточка профиля: статус, действия, теги
│       ├── FingerprintEditor.tsx # Редактор всех полей fingerprint + Advanced
│       ├── ProxyForm.tsx        # Форма добавления/редактирования прокси
│       ├── CookieWarmerModal.tsx # Модалка прогрева: категории, настройки, progress bar
│       └── ImportExportModal.tsx # Импорт/экспорт профилей JSON
│
├── supabase/
│   └── migrations/
│       └── 001_initial.sql      # Схема: profiles, proxies, RLS policies, trigger
│
└── docs/                        # Документация
    ├── architecture.md
    ├── project-structure.md
    ├── database.md
    ├── fingerprint-engine.md
    ├── coding-conventions.md
    └── electron-ipc.md
```

## Ключевые зависимости

| Пакет | Назначение |
|-------|-----------|
| `electron` | Desktop shell |
| `vite` + `vite-plugin-electron` | Сборка renderer + main process |
| `react` + `react-router-dom` | UI + routing |
| `tailwindcss` | Стили |
| `@supabase/supabase-js` | Backend: auth, DB, storage |
| `playwright` | Управление браузерами (Chromium) |
| `lucide-react` | Иконки |
| `react-hot-toast` | Уведомления |
| `electron-store` | Локальное хранение настроек |

## Скрипты

```bash
npm run dev              # Только Vite dev server (для разработки UI)
npm run electron:dev     # Vite + Electron одновременно (полная разработка)
npm run build            # Сборка для production
npm run electron:build   # Сборка + упаковка Electron (dmg/nsis/AppImage)
```
