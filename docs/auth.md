# Авторизация (Auth)

Приложение использует **Supabase Auth**: email/пароль и OAuth (Google, GitHub).

## OAuth (Google, GitHub)

### Настройка в Supabase Dashboard

1. **Authentication → Providers**  
   Включите нужные провайдеры (Google, GitHub) и укажите Client ID / Client Secret из консолей разработчика (Google Cloud, GitHub OAuth App).

2. **Authentication → URL Configuration**  
   В **Redirect URLs** добавьте URL, на которые Supabase может перенаправлять после входа:
   - Локально: `http://localhost:5173/login`
   - Продакшен: `https://your-domain.com/login`

   Без этих URL OAuth-редирект будет отклонён.

### Поведение в приложении

- Кнопки «Continue with Google» / «Continue with GitHub» на страницах входа и регистрации вызывают `signInWithOAuth(provider)`.
- Редирект после OAuth идёт на `{origin}/login`; Supabase добавляет в URL hash с токенами.
- При загрузке `/login` с hash клиент Supabase восстанавливает сессию, после чего приложение убирает hash из адреса и перенаправляет на главную (`/`).

## Email / пароль

- Вход: `signIn(email, password)`
- Регистрация: `signUp(email, password)` — при включённом подтверждении email пользователь получит письмо со ссылкой.
- Сброс пароля: «Forgot password?» → `resetPasswordForEmail(email)`.

## RLS

Таблицы `profiles` и `proxies` защищены RLS: доступ только по `auth.uid() = user_id`.
