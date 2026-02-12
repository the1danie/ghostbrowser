# Выкладка фронта на сервер

Фронт — это SPA (Vite + React). После сборки нужно отдать папку `dist/` через любой статический хостинг.

## 1. Сборка

В корне проекта:

```bash
npm ci
npm run build
```

Готовый фронт будет в папке **`dist/`**.

Переменные окружения при сборке (из `.env` или CI):

- `VITE_SUPABASE_URL` — URL проекта Supabase
- `VITE_SUPABASE_ANON_KEY` — анонимный ключ Supabase

Без них сборка может пройти, но приложение не подключится к бэкенду.

---

## 2. Варианты деплоя

### Вариант A: Vercel

1. Импортируйте репозиторий в [Vercel](https://vercel.com).
2. Настройки сборки:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`
3. В **Environment Variables** добавьте:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Деплой — Vercel сам подставит SPA fallback для роутинга.

---

### Вариант B: Netlify

1. Подключите репозиторий в [Netlify](https://netlify.com).
2. В настройках:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. В **Environment variables** добавьте `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
4. Создайте файл `public/_redirects` (или в корне `dist/` после сборки) с одной строкой:
   ```
   /*    /index.html   200
   ```
   Либо в Netlify: **Site settings → Build & deploy → Post processing → Asset optimization** не трогать, а в **Redirects** добавить правило: Path `/*`, To `/index.html`, Status `200`.

---

### Вариант C: Свой сервер (nginx)

1. Соберите проект локально: `npm run build`.
2. Скопируйте содержимое папки `dist/` на сервер (например, в `/var/www/nebulabrowse`):

   ```bash
   scp -r dist/* user@server:/var/www/nebulabrowse/
   ```

   Или через rsync:

   ```bash
   rsync -avz dist/ user@server:/var/www/nebulabrowse/
   ```

3. Пример конфига nginx для SPA (все маршруты отдаём `index.html`):

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/nebulabrowse;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Кэш для статики
       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. Перезапустите nginx: `sudo systemctl reload nginx`.

---

## 3. Важно

- Роутинг (React Router) работает только если сервер отдаёт `index.html` на любой путь (SPA fallback). На Vercel/Netlify это обычно уже настроено; на nginx — как в примере выше.
- После деплоя приложение будет открываться по вашему домену (не localhost), и проверка «не localhost» в коде не будет блокировать работу.
