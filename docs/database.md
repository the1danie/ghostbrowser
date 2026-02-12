# NebulaBrowse — База данных (Supabase)

## Схема

### Таблица `proxies`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid (PK) | `gen_random_uuid()` |
| `user_id` | uuid (FK → auth.users) | Владелец, cascade delete |
| `name` | text | Человекочитаемое имя (опционально) |
| `protocol` | text | `http`, `https`, `socks4`, `socks5` (check constraint) |
| `host` | text | IP или hostname |
| `port` | integer | 1–65535 (check constraint) |
| `username` | text | Логин для auth (nullable) |
| `password` | text | Пароль для auth (nullable) |
| `country` | text | ISO код страны (заполняется после проверки) |
| `city` | text | Город (заполняется после проверки) |
| `is_valid` | boolean | Результат последней проверки, default `true` |
| `last_checked_at` | timestamptz | Время последней проверки |
| `created_at` | timestamptz | `now()` |

### Таблица `profiles`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | uuid (PK) | `gen_random_uuid()` |
| `user_id` | uuid (FK → auth.users) | Владелец, cascade delete |
| `name` | text | Имя профиля |
| `status` | text | `new`, `active`, `running`, `blocked` (check constraint) |
| `group_name` | text | Группа для организации (nullable) |
| `tags` | text[] | Массив тегов, default `{}` |
| `fingerprint` | jsonb | Объект `BrowserFingerprint` (см. ниже) |
| `proxy_id` | uuid (FK → proxies) | Привязанный прокси, `on delete set null` |
| `cookies` | jsonb | Массив cookies, default `[]` |
| `notes` | text | Заметки пользователя |
| `user_data_path` | text | Путь к директории профиля |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | Автообновляется через trigger |

### Структура `fingerprint` (JSONB)

```typescript
interface BrowserFingerprint {
  userAgent: string;
  screenResolution: { width: number; height: number };
  webglVendor: string;
  webglRenderer: string;
  timezone: string;           // IANA timezone, e.g. "America/New_York"
  locale: string;             // e.g. "en-US"
  language: string;           // e.g. "en-US"
  hardwareConcurrency: number; // 2–16
  deviceMemory: number;        // 2, 4, 8, 16
  platform: string;           // "Win32", "MacIntel", "Linux x86_64"
  doNotTrack: string | null;  // null or "1"
  canvasNoise: number;        // 0–0.1
  audioNoise: number;         // 0–0.001
  webrtcPolicy: 'disable' | 'real' | 'fake';
  fonts: string[];
}
```

## Row Level Security (RLS)

Обе таблицы защищены RLS — пользователь видит и управляет **только своими** записями:

```sql
-- profiles
create policy "Users manage own profiles" on profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- proxies
create policy "Users manage own proxies" on proxies
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Индексы

```sql
create index idx_profiles_user_id on profiles(user_id);
create index idx_profiles_status on profiles(status);
create index idx_profiles_group on profiles(group_name);
create index idx_proxies_user_id on proxies(user_id);
```

## Trigger

```sql
-- Автообновление updated_at при любом UPDATE на profiles
create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();
```

## Паттерны работы с Supabase в коде

### Инициализация клиента (`src/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, anonKey);
```

### CRUD через hooks (пример из `useProfiles.ts`)
```typescript
// Fetch
const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

// Create — обязательно добавлять user_id
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('profiles').insert({ ...profileData, user_id: user.id }).select().single();

// Update
await supabase.from('profiles').update(updates).eq('id', id).select().single();

// Delete
await supabase.from('profiles').delete().eq('id', id);

// Bulk delete
await supabase.from('profiles').delete().in('id', ids);
```

### Авторизация (`useAuth.ts`)
```typescript
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signUp({ email, password });
await supabase.auth.signOut();
await supabase.auth.resetPasswordForEmail(email);
supabase.auth.onAuthStateChange(callback); // подписка на изменения сессии
```
