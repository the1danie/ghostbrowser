-- Таблица прокси (создаём первой, т.к. profiles ссылается на неё)
create table proxies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  protocol text not null check (protocol in ('http', 'https', 'socks4', 'socks5')),
  host text not null,
  port integer not null check (port > 0 and port < 65536),
  username text,
  password text,
  country text,
  city text,
  is_valid boolean default true,
  last_checked_at timestamptz,
  created_at timestamptz default now()
);

-- Таблица профилей
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  status text default 'new' check (status in ('new', 'active', 'running', 'blocked')),
  group_name text,
  tags text[] default '{}',
  fingerprint jsonb not null,
  proxy_id uuid references proxies(id) on delete set null,
  cookies jsonb default '[]',
  notes text,
  user_data_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Индексы
create index idx_profiles_user_id on profiles(user_id);
create index idx_profiles_status on profiles(status);
create index idx_profiles_group on profiles(group_name);
create index idx_proxies_user_id on proxies(user_id);

-- RLS
alter table profiles enable row level security;
alter table proxies enable row level security;

create policy "Users manage own profiles" on profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own proxies" on proxies
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Автообновление updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();
