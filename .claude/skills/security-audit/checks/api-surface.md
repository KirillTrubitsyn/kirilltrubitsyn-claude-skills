# API-поверхность

## Что проверять

### 1. Инвентаризация эндпоинтов
Найди все API route handlers в проекте и составь полную карту. Для каждого зафиксируй: HTTP-метод, путь, уровень защиты (public / auth / admin), наличие валидации входных данных.

Где искать маршруты:
- **Next.js**: `app/api/**/route.ts`, `pages/api/**/*.ts`, Server Actions в `app/**/actions.ts`
- **Express**: `app.get/post/put/delete/patch()`, `router.get()` и т.д.
- **Fastify**: `fastify.route()`, `fastify.get()` и т.д.
- **Django**: `urlpatterns`, `@api_view`, ViewSet-ы
- **FastAPI**: `@app.get()`, `@router.post()` и т.д.
- **Rails**: `config/routes.rb`, `resources`, `namespace`

### 2. Открытые эндпоинты без защиты
Для каждого эндпоинта без auth middleware определи: это допустимо (health check, публичная страница) или дыра? Опасные паттерны:
- Любой мутирующий эндпоинт (POST/PUT/DELETE/PATCH) без auth
- Эндпоинты, возвращающие пользовательские данные без auth
- Admin-эндпоинты, доступные без проверки роли

### 3. Валидация входных данных
- Есть ли schema validation (zod, joi, yup, pydantic, marshmallow, dry-validation)?
- Проверяются ли типы, длины, допустимые значения (whitelist vs blacklist)?
- Mass assignment: принимает ли эндпоинт произвольные поля из body и передаёт их в update/create? Ищи `req.body` напрямую в ORM-вызовах без фильтрации полей.

### 4. Rate limiting и anti-bruteforce
- Есть ли rate limiter (express-rate-limit, slowapi, rack-attack)?
- Как определяется IP клиента: доверяет ли `X-Forwarded-For` без валидации? За прокси/CDN это позволяет подставить произвольный IP.
- Где хранится состояние rate limiter: в памяти процесса (не работает при горизонтальном масштабировании) или в Redis/внешнем хранилище?
- Есть ли отдельный рейт-лимит на login/register/password-reset (более строгий, чем общий)?

### 5. Обработка ошибок
- Возвращаются ли stack traces в production-ответах? Ищи: `NODE_ENV !== 'production'`, `DEBUG = True`, отсутствие error handler middleware.
- Утекают ли имена таблиц, SQL-запросы, внутренние пути в сообщениях об ошибках?
- Ищи `catch` блоки, которые пробрасывают ошибку напрямую: `res.json({ error: err.message })` или `return Response.json(error)`.

### 6. HTTP-методы
- Разрешены ли лишние методы на эндпоинтах (OPTIONS, TRACE)?
- Для REST API: соответствуют ли методы семантике (GET не мутирует, DELETE требует подтверждения)?

### 7. SSRF (Server-Side Request Forgery, OWASP A10)
Если бэкенд делает HTTP-запросы по URL, полученному от пользователя (загрузка изображения по ссылке, preview URL, webhook URL, proxy), проверь:
- Блокируются ли приватные IP-диапазоны: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fd00::/8`?
- Блокируется ли доступ к metadata-эндпоинтам облачных провайдеров: `169.254.169.254` (AWS/GCP), `100.100.100.200` (Alibaba)?
- DNS rebinding: проверяется ли resolved IP после DNS-резолва, а не только hostname?
- Ограничены ли протоколы (`http://`, `https://` only)? Блокируются ли `file://`, `gopher://`, `dict://`?
- Webhook-интеграции: валидируется ли URL при регистрации webhook? Может ли атакующий зарегистрировать webhook на внутренний сервис?

### 8. Криптография (OWASP A02)
- Алгоритм хеширования паролей: bcrypt / argon2 / scrypt (безопасные) vs md5 / sha1 / sha256 без salt (уязвимые).
- Генерация случайных значений: `crypto.randomBytes` / `secrets.token_hex` (безопасные) vs `Math.random()` / `random.random()` (предсказуемые). Ищи использование предсказуемых генераторов для токенов, кодов подтверждения, сессий.
- Шифрование данных at rest: если хранятся чувствительные данные (PII, платёжные данные), зашифрованы ли они?

## Как искать в коде

```
# SSRF-паттерны
grep -rn "fetch\|axios\|http\.get\|requests\.get\|urllib\|httpx\|got\(\|needle\|node-fetch" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# Хеширование паролей
grep -rn "bcrypt\|argon2\|scrypt\|md5\|sha1\|sha256\|hashlib\|createHash\|pbkdf2" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# Случайные значения
grep -rn "Math\.random\|random\.random\|random\.randint\|randomBytes\|secrets\.\|crypto\.random\|uuid" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# Все route handlers
grep -rn "app\.\(get\|post\|put\|delete\|patch\|all\)\|router\.\(get\|post\|put\|delete\|patch\)\|@app\.\(get\|post\|put\|delete\)\|export.*\(GET\|POST\|PUT\|DELETE\|PATCH\)" --include="*.{ts,tsx,js,jsx,py,rb}"

# Эндпоинты без auth
# (ищи route handlers, затем проверяй, применён ли к ним auth middleware)

# Mass assignment
grep -rn "req\.body\|request\.data\|request\.json\|params\.permit\|\.create(\|\.update(" --include="*.{ts,tsx,js,jsx,py,rb}"

# Error handlers
grep -rn "err\.message\|error\.message\|stack\|traceback\|DEBUG.*True" --include="*.{ts,tsx,js,jsx,py,rb}"

# Rate limiting
grep -rn "rateLimit\|rate.limit\|throttle\|slowapi\|rack.attack\|RateLimiter" --include="*.{ts,tsx,js,jsx,py,rb}"
```
