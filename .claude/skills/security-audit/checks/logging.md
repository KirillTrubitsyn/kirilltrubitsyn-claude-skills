# Логирование и мониторинг

## Что проверять

### 1. Audit logging
- Логируются ли мутации данных (create, update, delete)? Для каждой мутации должно быть зафиксировано: кто, когда, что, откуда (IP, user agent).
- Логируются ли события аутентификации: login, logout, failed login, password change, 2FA toggle?
- Логируются ли admin-действия: изменение ролей, удаление пользователей, изменение конфигурации?

### 2. PII в логах
- Проверь, не попадают ли в логи: пароли, токены, номера карт, паспортные данные, email-адреса, телефоны.
- Ищи паттерны полного логирования объектов запроса/ответа: `console.log(req)`, `logger.info(JSON.stringify(body))`, `print(request.data)`.
- Для GDPR/ФЗ-152: наличие PII в логах создаёт обязательства по хранению и удалению.

### 3. Log injection
- Если лог принимает пользовательский ввод: можно ли вставить fake log entries?
- Пример: пользователь отправляет username `admin\n[2024-01-01] INFO: User admin logged in successfully`. Если логгер не экранирует переносы строк, это создаёт поддельные записи.

### 4. Мониторинг и alerting
- Есть ли alerting на аномалии: mass failed logins, mass deletions, unusual API usage spikes?
- Настроен ли мониторинг доступности (uptime)?
- Есть ли rate limit monitoring: оповещение при массовых блокировках?

### 5. Log retention и доступ
- Где хранятся логи: на диске сервера (теряются при перезапуске контейнера) или во внешнем сервисе?
- Кто имеет доступ к логам? Нет ли публичных endpoint-ов для чтения логов?
- Есть ли retention policy (автоудаление через N дней)?

### 6. Error tracking
- Используется ли error tracking (Sentry, Bugsnag, Rollbar)? Если да: не утекают ли секреты в error payloads?
- Sentry DSN: это `NEXT_PUBLIC_` переменная (клиентская, допустимо) или серверный auth token (нельзя на клиент)?

## Как искать в коде

```
# Логирование
grep -rn "console\.log\|console\.error\|logger\.\|winston\|pino\|bunyan\|logging\.\|log\.\(info\|warn\|error\|debug\)" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# PII в логах
grep -rn "log.*password\|log.*token\|log.*secret\|log.*credit\|log.*card\|console.*password\|print.*password" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# Error tracking
grep -rn "sentry\|Sentry\|bugsnag\|Bugsnag\|rollbar\|Rollbar\|SENTRY_DSN" --include="*.{ts,tsx,js,jsx,py,rb,go,env,env.*,json}"

# Audit events
grep -rn "audit\|auditLog\|activity.*log\|event.*log\|track.*event" --include="*.{ts,tsx,js,jsx,py,rb,go}"
```
