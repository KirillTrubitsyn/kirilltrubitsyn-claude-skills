# Секреты и credentials

## Что проверять

### 1. Хардкоженные секреты в коде
Ищи в рабочем дереве проекта:
- API keys, токены, пароли, private keys
- Connection strings с встроенными credentials
- Webhook secrets, encryption keys
- Паттерны: строки длиной > 20 символов в кавычках рядом с переменными, содержащими `key`, `secret`, `token`, `password`, `auth`, `credential`

### 2. Секреты в git-истории
Даже если секрет уже удалён из текущего кода, он остаётся в истории коммитов. Выполни:
```bash
git log --all -p -S "SECRET\|API_KEY\|PASSWORD\|TOKEN\|ADMIN\|service_role\|private_key" --diff-filter=D -- '*.env' '*.json' '*.yml' '*.yaml' '*.ts' '*.js' '*.py'
```
Также проверь: `.env` файлы когда-либо коммитились? `git log --all -- "*.env"`

### 3. Env-переменные и конфигурация
- Есть ли `.env` в `.gitignore`?
- Есть ли `.env.example` с реальными значениями вместо плейсхолдеров?
- **Критично для Next.js / Nuxt / Vite / CRA**: переменные с префиксом `NEXT_PUBLIC_` / `NUXT_PUBLIC_` / `VITE_` / `REACT_APP_` попадают в клиентский бандл. Проверь, что среди них нет service_role keys, database URLs, admin tokens.
- Проверь `import "server-only"` (Next.js): модули с секретами должны быть помечены, чтобы исключить случайный импорт на клиенте.

### 4. Секреты в документации и конфигах
- README, SETUP.md, CONTRIBUTING.md с реальными токенами
- `docker-compose.yml` с захардкоженными паролями БД
- CI/CD конфиги (`.github/workflows/*.yml`) с inline-секретами вместо GitHub Secrets
- Swagger/OpenAPI спеки с примерами, содержащими реальные токены

### 5. Логи
- Проверь, не логируются ли токены, пароли, API keys: `console.log(req.headers)`, `logger.info(credentials)`, `print(request.data)`
- Ищи паттерны логирования полного объекта запроса/ответа

## Как искать в коде

```
# Хардкоженные секреты
grep -rn "sk-\|sk_live\|pk_live\|ghp_\|gho_\|xoxb-\|xoxp-\|AKIA\|AIza\|eyJhbG" --include="*.{ts,tsx,js,jsx,py,rb,go,json,yml,yaml,env,md}"

# Переменные с секретами
grep -rn "API_KEY\|SECRET_KEY\|PRIVATE_KEY\|PASSWORD\|DATABASE_URL\|SUPABASE_SERVICE_ROLE\|JWT_SECRET\|ENCRYPTION_KEY\|WEBHOOK_SECRET" --include="*.{ts,tsx,js,jsx,py,rb,go,env,env.*}"

# Next.js: секреты в публичных переменных
grep -rn "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*KEY\|NEXT_PUBLIC_.*PASSWORD\|NEXT_PUBLIC_.*SERVICE_ROLE\|NEXT_PUBLIC_.*ADMIN" --include="*.{ts,tsx,js,jsx,env,env.*}"

# Логирование секретов
grep -rn "console\.log.*token\|console\.log.*password\|console\.log.*secret\|console\.log.*key\|logger.*password\|print.*password\|log.*credentials" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# .env в git
git ls-files | grep -i "\.env"
```

## Классификация

| Находка | Severity |
|---|---|
| Service role key / admin key в клиентском коде | Critical |
| API key в git-истории (не ротирован) | Critical |
| Секрет в `.env.example` с реальным значением | High |
| NEXT_PUBLIC_ с чувствительным ключом | High |
| Логирование токенов | Medium |
| `.env` не в `.gitignore` | Medium |
