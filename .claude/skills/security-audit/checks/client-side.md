# Клиентская безопасность

Применяй этот модуль при наличии фронтенда (React, Vue, Svelte, Angular, Astro, HTML/JS).

## Что проверять

### 1. XSS (Cross-Site Scripting)
- Ищи места, где пользовательский ввод вставляется в DOM без экранирования.
- **React**: использование `dangerouslySetInnerHTML` — каждый случай требует проверки: санитизируется ли HTML (DOMPurify)?
- **Vue**: директива `v-html` — аналог `dangerouslySetInnerHTML`.
- **Vanilla JS**: `innerHTML`, `outerHTML`, `document.write()`, `insertAdjacentHTML()`.
- **Server-side rendering**: если данные из БД рендерятся в HTML на сервере без экранирования.
- **Markdown rendering**: если пользовательский Markdown рендерится в HTML, включена ли санитизация? Многие библиотеки (marked, remark) по умолчанию не фильтруют `<script>` и `<img onerror>`.

### 2. Хранение чувствительных данных
- Хранятся ли токены, пароли, PII в `localStorage` или `sessionStorage`? Эти хранилища уязвимы к XSS: любой скрипт на странице имеет к ним доступ.
- Предпочтительно: `httpOnly` cookies для токенов.
- Кешируются ли чувствительные данные в state management (Redux/Zustand/Pinia) дольше необходимого?

### 3. Open Redirect
- Ищи редиректы, где URL берётся из параметров запроса: `?redirect=`, `?returnUrl=`, `?next=`.
- Проверь: валидируется ли URL? Можно ли подставить внешний домен (`?redirect=https://evil.com`)?
- Паттерны: `window.location = params.redirect`, `router.push(query.returnUrl)`, `res.redirect(req.query.next)`.

### 4. PostMessage
- Если приложение использует `window.postMessage`: проверяется ли origin входящих сообщений?
- `event.origin` должен проверяться против whitelist. Без проверки любой iframe может отправлять команды.

### 5. CSRF
- Для приложений с cookie-based auth: есть ли CSRF-защита (csrf token, SameSite cookie)?
- Для SPA с bearer tokens в headers: CSRF обычно не актуален, но проверь, что токен не передаётся через cookie без SameSite.

### 6. Sensitive Data in URL
- Передаются ли токены, пароли, PII через URL query parameters? Они попадают в логи сервера, историю браузера, Referer header.

### 7. Source Maps
- Доступны ли source maps в production? Они раскрывают исходный код. Проверь: `.map` файлы, `sourceMappingURL` в бандлах, конфигурация webpack/vite.

## Как искать в коде

```
# XSS-паттерны
grep -rn "dangerouslySetInnerHTML\|v-html\|innerHTML\|outerHTML\|document\.write\|insertAdjacentHTML" --include="*.{ts,tsx,js,jsx,vue,svelte,html}"

# localStorage с секретами
grep -rn "localStorage\.\(set\|get\)Item.*\(token\|password\|secret\|key\|auth\)\|sessionStorage\.\(set\|get\)Item.*\(token\|password\|secret\)" --include="*.{ts,tsx,js,jsx,vue,svelte}"

# Open redirect
grep -rn "redirect\|returnUrl\|next=\|window\.location\s*=\|router\.push.*query\|res\.redirect.*req\.\(query\|params\)" --include="*.{ts,tsx,js,jsx,vue,svelte,py,rb}"

# PostMessage
grep -rn "postMessage\|addEventListener.*message" --include="*.{ts,tsx,js,jsx,vue,svelte}"

# Source maps
grep -rn "sourceMappingURL\|devtool.*source.map\|productionSourceMap" --include="*.{ts,tsx,js,jsx,json,config.*}"
```
