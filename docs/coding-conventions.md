# NebulaBrowse — Coding Conventions

## Общие принципы

- Язык: **TypeScript** (strict mode)
- Без any, кроме случаев взаимодействия с Electron IPC и Supabase JSONB
- Не оставлять TODO/заглушки — каждая функция должна быть рабочей
- Минимум абстракций — не создавать утилиты/хелперы для одноразовых операций

## Именование

| Что | Конвенция | Пример |
|-----|----------|--------|
| Файлы компонентов | PascalCase | `ProfileCard.tsx` |
| Файлы библиотек | kebab-case | `fingerprint-generator.ts` |
| Файлы хуков | camelCase с `use` | `useProfiles.ts` |
| Интерфейсы | PascalCase | `BrowserFingerprint` |
| Функции | camelCase | `generateFingerprint()` |
| Константы | UPPER_SNAKE или camelCase | `WARMER_CATEGORIES`, `USER_AGENTS` |
| CSS классы | kebab-case (Tailwind utility) | `bg-ghost-800` |

## React компоненты

### Структура файла
```typescript
import { useState } from 'react';              // React imports
import { Icon } from 'lucide-react';            // External libs
import { useHook } from '../hooks/useHook';     // Internal imports
import type { Type } from '../lib/supabase';    // Types

interface Props {                                // Props interface (не export)
  prop1: string;
  onAction: () => void;
}

export default function ComponentName({ prop1, onAction }: Props) {
  const [state, setState] = useState('');        // State
  // ...логика
  return (<div>...</div>);                       // JSX
}
```

### Правила
- Компоненты — `function`, не arrow functions
- `export default function` — один компонент на файл
- Props interface объявляется прямо в файле (не экспортируется)
- Деструктуризация props в параметрах функции
- Состояние через `useState`, эффекты через `useEffect`
- Обработчики событий — `handle` prefix: `handleSubmit`, `handleDelete`
- Async операции в обработчиках — try/catch + `toast.error()`

## Hooks

### Структура
```typescript
export function useProfiles() {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => { ... }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const create = async (input: CreateInput) => { ... };
  const update = async (id: string, updates: Partial<Type>) => { ... };
  const delete_ = async (id: string) => { ... };

  return { data, loading, fetchData, create, update, delete: delete_ };
}
```

### Правила
- Хук возвращает объект с данными + операциями
- `loading` state для индикации загрузки
- Оптимистичные обновления: `setData(prev => ...)` сразу после успешного запроса
- Supabase `.select().single()` после insert/update для получения актуальных данных

## Supabase

- Клиент создаётся один раз в `src/lib/supabase.ts`
- Все запросы из renderer process (не из main)
- При создании записей **обязательно** получать `user_id` через `supabase.auth.getUser()`
- Использовать `.select()` после `.insert()` и `.update()` для получения полных данных
- Bulk операции: `.in('id', ids)` для delete/update нескольких записей

## Стили

### Tailwind
- Кастомные цвета: `ghost-50..950` (серо-синяя палитра), `accent` (indigo)
- Предустановленные классы в `index.css`:
  - `.btn-primary`, `.btn-secondary`, `.btn-danger`
  - `.input-field`, `.select-field`
  - `.card`
  - `.badge`, `.badge-new`, `.badge-active`, `.badge-running`, `.badge-blocked`
- Тёмная тема — всегда (нет toggle)
- Анимации: `transition-colors duration-150` для hover, `animate-spin` для загрузки, `animate-pulse` для статуса running

### Модальные окна
```jsx
<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
  <div className="bg-ghost-800 rounded-xl border border-ghost-600 w-full max-w-lg">
    {/* header с кнопкой X */}
    {/* content */}
    {/* footer с actions */}
  </div>
</div>
```

## Electron

### IPC паттерны
- Request-response: `ipcMain.handle()` + `ipcRenderer.invoke()`
- Push events: `webContents.send()` + `ipcRenderer.on()` (только для progress)
- Все IPC каналы имеют namespace: `browser:`, `proxy:`, `shell:`, `warming:`

### preload.ts
- Только `contextBridge.exposeInMainWorld()`
- Никакой бизнес-логики
- Каждый метод — обёртка над `ipcRenderer.invoke()`

### browser-manager.ts
- Одна Map для running profiles
- Playwright `chromium.launch()` для каждого профиля
- `context.addInitScript()` для fingerprint injection
- `context.storageState()` для сохранения/восстановления cookies

## Иконки

Используем `lucide-react`. Размеры:
- В кнопках: `w-4 h-4`
- В навигации: `w-5 h-5`
- Логотип: `w-7 h-7` или `w-10 h-10`

## Обработка ошибок

- В компонентах: `try/catch` + `toast.error(err.message)`
- В Electron main: `try/catch` + return `{ success: false, error: message }`
- В хуках: пробрасываем ошибку наверх (throw), ловим в компоненте
- Не используем глобальные error boundaries (пока)
