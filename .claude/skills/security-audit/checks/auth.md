# Аутентификация и авторизация

## Что проверять

### 1. Обход аутентификации
- Найди все middleware/функции, отвечающие за проверку аутентификации (auth middleware, guards, decorators).
- Проверь, применяются ли они ко всем защищённым маршрутам или есть пробелы.
- Проверь, можно ли обратиться к защищённым API-эндпоинтам напрямую (curl/Postman), минуя UI. Это ключевой тест: если фронтенд скрывает кнопку, но бэкенд не проверяет токен, защиты нет.

### 2. Broken Access Control (OWASP A01)
- **IDOR**: проверь, привязаны ли операции чтения/записи/удаления к текущему пользователю. Ищи паттерны, где `id` берётся из URL/body без сверки с `req.user` или `session.user`.
- **Horizontal escalation**: может ли пользователь A получить доступ к данным пользователя B, подставив чужой ID?
- **Vertical escalation**: может ли обычный пользователь вызвать admin-эндпоинт? Ищи проверки роли (role check) и убедись, что они не только на фронтенде.
- **Bulk-операции**: если есть `DELETE ?all=true` или batch-эндпоинты, проверь, что scope ограничен текущим пользователем.

### 3. Сессии и токены
- Где хранятся токены на клиенте: localStorage (уязвимо к XSS) vs httpOnly cookie (предпочтительно)?
- Проверь refresh-flow: можно ли переиспользовать старый refresh-токен после ротации?
- Logout: инвалидируется ли токен на сервере, или только удаляется на клиенте?
- Время жизни access-токена: если более 1 часа, это повышенный риск.
- JWT: проверь, что верификация не принимает `alg: none` и нет key confusion (RS256 vs HS256).

### 4. 2FA
- Если реализована: есть ли grace period, позволяющий обойти 2FA?
- Есть ли fallback без 2FA (например, magic link без 2FA-проверки)?
- Рейт-лимит на ввод кода: можно ли перебирать 6-значный код?

### 5. Регистрация и восстановление пароля
- Enumeration: различаются ли ответы при «email не найден» vs «неверный пароль»? Это позволяет перебирать существующие аккаунты.
- Ссылка сброса пароля: одноразовая? Есть TTL? Привязана к конкретному пользователю?
- Сложность пароля: есть ли минимальные требования?

## Как искать в коде

```
# Middleware аутентификации
grep -rn "auth\|authenticate\|requireAuth\|isAuthenticated\|protect\|guard\|@login_required\|@auth\|verify_token\|getSession\|getUser" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# Проверки ролей
grep -rn "role\|isAdmin\|admin_only\|permission\|authorize\|@roles\|@requires" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# JWT-конфигурация
grep -rn "jwt\|jsonwebtoken\|jose\|JWT_SECRET\|TOKEN_SECRET\|alg.*none" --include="*.{ts,tsx,js,jsx,py,rb,go,json,env}"

# IDOR-паттерны (ID из параметров без проверки ownership)
grep -rn "params\.id\|params\.userId\|req\.body\.id\|request\.args\|path_param" --include="*.{ts,tsx,js,jsx,py,rb,go}"
```

## На что обращать внимание в конкретных фреймворках

**Next.js**: middleware.ts должен покрывать все защищённые маршруты. Route handlers в `app/api/` могут не наследовать middleware автоматически. Server actions тоже требуют проверки auth.

**Supabase**: проверь, что на клиенте используется `anon` key, а `service_role` key только на сервере. RLS-политики проверяются в модуле `database.md`.

**Express/Fastify**: проверь, что auth middleware применяется через `app.use()` к группе маршрутов, а не забыт на отдельных route handlers.

**Django**: проверь `@login_required`, `@permission_required`, `IsAuthenticated` в DRF viewsets.

**Rails**: проверь `before_action :authenticate_user!`, Pundit/CanCanCan policies.
