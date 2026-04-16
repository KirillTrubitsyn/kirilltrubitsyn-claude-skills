# Бизнес-логика

## Что проверять

### 1. Обход оплаты и квот
- Если есть платные функции или подписки: проверяется ли уровень подписки на сервере, или только на клиенте?
- Может ли пользователь бесплатного плана вызвать API premium-функции напрямую?
- Есть ли лимиты использования (requests/day, storage, API calls)? Проверяются ли они на бэкенде?
- Может ли пользователь обнулить свой счётчик использования через API?

### 2. Feature flags и A/B тесты
- Если используются feature flags: хранятся ли они на клиенте (можно подменить в DevTools)?
- Может ли пользователь активировать скрытые/premium-функции через манипуляцию с localStorage/cookies/URL-параметрами?

### 3. Race conditions (TOCTOU)
- Time-of-check-to-time-of-use: между проверкой условия и выполнением действия может вклиниться конкурентный запрос.
- Типичные сценарии: двойное списание баланса, создание дублей при быстрых повторных запросах, бронирование одного слота двумя пользователями.
- Защита: database-level constraints, оптимистичная блокировка, idempotency keys.

### 4. Enumeration
- Можно ли перебирать ресурсы (пользователей, документы, заказы) через последовательные ID?
- Используются ли UUID вместо автоинкрементных ID для публичных идентификаторов?
- Различаются ли ответы для существующих и несуществующих ресурсов (timing, HTTP-код, сообщение)?

### 5. Abuse сценарии
- Можно ли отправить массу запросов на создание объектов (спам-регистрации, создание тысяч записей)?
- Есть ли captcha или anti-bot защита на публичных формах?
- Может ли пользователь использовать функции приложения для атак на третьих лиц (отправка email через приложение, webhook forwarding)?

### 6. Идемпотентность
- Повторная отправка формы / retry запроса: создаётся ли дубликат, или операция идемпотентна?
- Для платёжных/критичных операций: есть ли idempotency key?

## Как искать в коде

```
# Проверки подписки/плана
grep -rn "plan\|subscription\|tier\|premium\|pro\|limit\|quota\|usage\|credits\|allowance" --include="*.{ts,tsx,js,jsx,py,rb,go}"

# Feature flags
grep -rn "feature.*flag\|featureFlag\|LaunchDarkly\|unleash\|flagsmith\|splitio\|FEATURE_" --include="*.{ts,tsx,js,jsx,py,rb,go,env}"

# Sequential IDs
grep -rn "autoIncrement\|serial\|SERIAL\|AUTO_INCREMENT\|IDENTITY" --include="*.{sql,prisma,ts,tsx,js,jsx,py,rb}"

# Idempotency
grep -rn "idempoten\|retry\|dedup\|unique.*constraint\|ON CONFLICT" --include="*.{ts,tsx,js,jsx,py,rb,go,sql,prisma}"
```
