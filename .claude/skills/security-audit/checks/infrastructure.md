# Инфраструктура и заголовки безопасности

## Что проверять

### 1. Security Headers
Проверь конфигурацию HTTP-заголовков:

| Заголовок | Что проверить | Риск при отсутствии |
|---|---|---|
| `Content-Security-Policy` | Нет ли `unsafe-inline`, `unsafe-eval`, `*` в директивах? | XSS |
| `Strict-Transport-Security` | Присутствует с `max-age >= 31536000`, `includeSubDomains`? | Downgrade-атака |
| `X-Frame-Options` | `DENY` или `SAMEORIGIN`? | Clickjacking |
| `X-Content-Type-Options` | `nosniff`? | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` или строже? | Утечка URL |
| `Permissions-Policy` | Ограничены ли camera, microphone, geolocation? | Доступ к оборудованию |

Где искать: `next.config.js` (headers), `middleware.ts`, Express `helmet()`, Nginx/Apache конфиги.

### 2. CORS
- Разрешены ли произвольные origins (`Access-Control-Allow-Origin: *`)? Для API с аутентификацией это уязвимость.
- Используется ли динамический origin, который рефлектит заголовок запроса без валидации?
- Разрешены ли credentials (`Access-Control-Allow-Credentials: true`) одновременно с wildcard origin?
- Проверь, что список разрешённых origins — whitelist, а не regex с обходами.

### 3. HTTPS и транспорт
- Принудительный HTTPS: есть ли редирект с HTTP?
- Certificate: используется ли автоматическое обновление (Let's Encrypt)?
- TLS-версия: отключены ли TLS 1.0 и 1.1?

### 4. Deployment Platform
**Railway**: проверь `railway.json` / `railway.toml` — нет ли exposed debug ports, env переменных в конфиге вместо Railway secrets.

**Vercel**: проверь `vercel.json` — правильны ли rewrites/redirects, нет ли open redirects?

**Docker**: если есть Dockerfile — запускается ли процесс от root? Используется ли multi-stage build? Есть ли `.dockerignore`, исключающий `.env`, `.git`, `node_modules`?

**Fly.io**: проверь `fly.toml` — внутренние порты, health checks.

### 5. DNS и домены
- Нет ли CNAME-записей, указывающих на деактивированные сервисы (subdomain takeover)?
- Если используется wildcard DNS — это расширяет поверхность атаки.

## Как искать в коде

```
# Security headers
grep -rn "helmet\|Content-Security-Policy\|X-Frame-Options\|Strict-Transport\|X-Content-Type\|Referrer-Policy\|Permissions-Policy" --include="*.{ts,tsx,js,jsx,py,rb,conf,json}"

# CORS
grep -rn "cors\|Access-Control\|allowedOrigins\|origin.*\*\|CORS_ALLOWED" --include="*.{ts,tsx,js,jsx,py,rb,conf,json,yml}"

# Deployment configs
ls -la railway.json railway.toml vercel.json fly.toml docker-compose.yml Dockerfile .dockerignore 2>/dev/null
```
