# MCP (Model Context Protocol) Security

Применяй этот модуль, если проект использует MCP-серверы (Anthropic MCP, Claude Desktop, Cursor, клиенты через `mcp-remote`, собственные серверы на `@modelcontextprotocol/sdk` или `fastmcp`). MCP за 2025–2026 год стал массовой поверхностью атаки: тулз-пойзонинг, rug pull, command injection в tool handlers, cross-tenant утечки, RCE через OAuth-прокси. Основные публичные инциденты: CVE-2025-6514 (mcp-remote RCE, CVSS 9.6), CVE-2025-68143 / 68144 / 68145 (цепочка в Anthropic mcp-server-git → RCE через `.git/config`), инцидент Asana MCP (cross-tenant leak), GitHub MCP (exfiltration через over-privileged PAT).

**Главный сдвиг 2026 года: уязвимость на уровне протокола, не реализации.** Раскрытие OX Security «The Mother of All AI Supply Chains» (15–20 апреля 2026) показало, что STDIO transport официальных MCP SDK (Python, TypeScript, Java, Rust) передаёт command-строку из конфига в `subprocess.Popen` / `child_process.spawn` и **исполняет её до валидации MCP handshake** — команда успевает отработать, даже если соединение затем отклонено. Anthropic подтвердил это как intended design. Затронуто ~200 000 инстансов, 150M+ загрузок; за январь–апрель 2026 подано 40+ CVE. Четыре вектора из одного корня: (1) unauthenticated command injection через web-интерфейсы фреймворков, (2) allowlist bypass через argument injection, (3) zero-click prompt injection в AI IDE, (4) marketplace poisoning (9 из 11 реестров приняли вредоносный PoC без детекции). Активно эксплуатируются: CVE-2026-33032 (nginx-ui «MCPwn», 9.8), CVE-2026-5058/9 (aws-mcp-server pre-auth RCE), CVE-2026-32211 (@azure-devops/mcp auth bypass), CVE-2026-30615 (Windsurf zero-click, на май 2026 не исправлено).

**Маппинг на OWASP Top 10 for Agentic Applications:2026**: MCP-риски ложатся преимущественно на ASI04 (Agentic Supply Chain Vulnerabilities), ASI02 (Tool Misuse), ASI03 (Identity & Privilege Abuse), ASI05 (Unexpected Code Execution). Используй эти коды в отчёте наряду с CVE.

## Что проверять

### 1. Tool poisoning и rug pull

MCP-серверы могут менять определения tools между сессиями. Пользователь одобряет tool на день 1, через неделю тот же tool тихо переправляет API-ключи атакующему.

- Есть ли пиннинг версий MCP-серверов? Конфигурация клиента должна содержать конкретную версию или SHA, не `latest`. Проверь `mcp.json`, `claude_desktop_config.json`, `.cursor/mcp.json`.
- Есть ли allowlist tools? Даже если сервер предлагает 20 tools, в конфигурации клиента должен быть явный список разрешённых.
- Детектируются ли изменения tool definitions? При подключении к серверу должен вычисляться хэш от списка tools и сравниваться с предыдущим — при расхождении запрашивать повторное согласие пользователя.
- Есть ли cryptographic server verification при cloud-hosted MCP? Клиент должен проверять сертификат сервера, а не доверять hostname.

### 2. Command injection и RCE в tool handlers

Если проект содержит собственный MCP-сервер, проверь все tool handlers на классические injection-уязвимости. В 2025–2026 году именно это — основной класс RCE в MCP.

- Аргументы, передаваемые в `exec`, `child_process.spawn`, `subprocess.run`, `os.system` — санитизированы ли они? Не используется ли `shell=True`?
- Пути файлов из аргументов — проверяются ли на `..`, absolute paths, null bytes, case-sensitivity bypass (инцидент Cursor с `.cursor/mcp.json` через case-insensitive FS)?
- Git-операции: передача user input в `git clone`, `git diff`, `git init` — потенциальный argument injection (паттерн CVE-2025-68144). Передача git-URL, начинающихся с `--upload-pack=`, `--config=` — классический вектор RCE.
- SQL-tools: параметризация запросов, не конкатенация.
- URL fetching в tools: SSRF-защита (см. `api-surface.md` раздел 7).

### 3. Over-privileged tokens и credentials

Инцидент GitHub MCP и в целом кампания марта–апреля 2026 показали: широкие PAT + untrusted content в контексте LLM = автоматический exfiltration через легитимные tool calls.

- Какие scope у токенов, передаваемых в MCP-сервер? Должен быть минимальный набор: `repo:read` вместо `repo`, `issues:read` вместо `admin:org`.
- Используются ли **ephemeral credentials** с TTL минуты, а не long-lived tokens?
- Разделены ли identity для разных агентов? Один общий service account на все MCP-серверы — анти-паттерн.
- Применяется ли OAuth 2.0 Token Exchange (RFC 8693) для on-behalf-of делегирования, чтобы MCP-сервер действовал от имени пользователя с его правами, а не с правами сервиса?
- Передаются ли токены через `env`-переменные tool'а (ok), или через аргументы (попадут в логи процессов)?

### 4. Cross-tenant isolation

Для мультитенантных приложений с MCP-интеграциями это отдельный риск. Инцидент Asana MCP (июнь 2025) — данные одной организации стали видны другой из-за логической ошибки в access control MCP-feature.

- Для каждого tool, работающего с данными: откуда берётся tenant_id? Только из верифицированного контекста запроса, не из аргументов tool.
- Тест: пользователь tenant A → MCP tool с подставленным tenant_id = B → должен вернуть 403 или пустой результат, не данные B.
- Логирование tool calls должно быть scoped per-tenant.
- KMS-ключи и encryption at rest — per-tenant, не общие.

### 5. Authentication и транспорт

Спецификация MCP исторически слабо регламентирует auth, что приводит к разнородным и часто слабым реализациям.

- Session IDs в URL — **анти-паттерн**, но встречается в реализациях SSE-transport. Session ID должен быть в заголовке или cookie, не `GET /messages/?sessionId=UUID`.
- Message signing: подписаны ли сообщения между клиентом и сервером? Без подписи возможен MITM и tampering.
- HTTPS для всех remote MCP. Явно блокировать HTTP (CVE-2025-6514 эксплуатировалась при downgrade на HTTP).
- Для локальных MCP-серверов на HTTP transport: проверка защиты от DNS rebinding (инцидент Vet MCP, июль 2025). Сервер должен проверять заголовок `Host`, `Origin`, использовать случайный порт и auth token.
- `mcp-remote` как OAuth-прокси: версия ≥ 0.1.16 (фикс CVE-2025-6514). Версии 0.0.5–0.1.15 — критично.
- MCP Inspector в dev-режиме: не должен быть доступен на `0.0.0.0` без auth (CVE-2025-49596, CVSS 9.4 — unauthenticated RCE). MCPJam Inspector — CVE-2026-23744 (unauthenticated endpoint на 0.0.0.0 устанавливает произвольный MCP-сервер).
- **OAuth в MCP-спеке объявлен опциональным** — по сканам 2026 года до 38% публичных серверов не требуют аутентификации вообще (Trend Micro: 492 сервера без auth, июль 2025: 1 862 публично доступных инстанса). Если сервер remote — auth должен быть обязательным, не «по желанию».
- Версия SDK: уязвимость STDIO config-to-exec — на уровне официальных SDK. Проверь, что используется версия с митигацией (после апрельского раунда патчей 2026) и что command-строки в конфиге не формируются из внешнего ввода.

### 6. Human-in-the-loop для destructive операций

Чисто автономный агент с write-доступом — основной вектор excessive agency (OWASP LLM06:2025).

- Определены ли категории destructive операций: write / delete / financial / admin / external-communication?
- Для каждой такой категории — mandatory approval gate: агент показывает preview, пользователь явно подтверждает.
- Пороги уверенности: операции ниже threshold уходят на human review.
- Логируется ли approver identity вместе с самим действием?
- Если операция irreversible (удаление, списание, публикация) — step-up auth через IdP.

### 7. Sandboxing и изоляция

- Локальные MCP-серверы: запущены ли в sandbox (container, chroot, macOS sandbox, Windows AppContainer)?
- Filesystem scope: MCP Filesystem сервер должен иметь явный allowlist директорий, не root FS.
- Network egress: MCP-сервер должен иметь ограниченный egress, блокируя доступ к internal services.
- Для HTTP transport — rate limiting per client.
- Рекомендация: MCP Gateway pattern (TrueFoundry, Docker MCP Gateway, MCP Manager) как единая точка с RBAC, rate limiting, audit logging.

### 8. Confused deputy и tool shadowing

- Когда подключены несколько MCP-серверов: не могут ли они иметь одинаковые или похожие имена tools? Tool shadowing — malicious server переопределяет легитимный tool.
- Валидируются ли имена tools по whitelist, или клиент просто берёт то, что сервер объявил?
- Validation input/output на MCP-слое: tool result от одного сервера не должен содержать инструкции, которые LLM интерпретирует как команду другому серверу (indirect prompt injection через tool result).
- Untrusted servers co-connected с trusted: могут ли они exfiltrate данные через shared agent context? Академическое исследование 67 057 MCP-серверов (октябрь 2025) показало массовость проблемы.

### 9. Dynamic client registration и OAuth-прокси

Относится к MCP-серверам, действующим как OAuth-прокси для сторонних API (static client ID + dynamic client registration).

- MCP proxy с static client ID + third-party authorization server, который ставит consent cookie после первой авторизации → атака "cookie confusion": второй клиент получает токены без consent.
- Для каждого MCP client должен быть отдельный per-client consent перед forwarding в upstream provider.
- Origin validation на MCP endpoint.

## Как искать в коде

```bash
# Конфигурация MCP-клиентов
find . -name "mcp.json" -o -name "claude_desktop_config.json" -path "*/.cursor/*" -name "*.json" 2>/dev/null
grep -rn "mcpServers\|mcp_servers" --include="*.json" --include="*.yaml" --include="*.yml"

# Собственные MCP-серверы: handlers, которые принимают user input
grep -rn "@server\.tool\|@mcp\.tool\|server\.setRequestHandler\|tool(\"" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py"

# Command execution в tool handlers
grep -rn "exec(\|execSync\|spawn(\|subprocess\.\|child_process\|os\.system\|shell=True" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py"

# mcp-remote версия
grep -rn "mcp-remote" --include="package.json" --include="*.json"
npm list mcp-remote 2>/dev/null

# Session IDs в URL (анти-паттерн)
grep -rn "sessionId=\|session_id=.*url\|?sid=" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py"

# OAuth flows в MCP
grep -rn "authorization_endpoint\|client_id.*static\|dynamic_registration\|oauth.*mcp" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py"

# DNS rebinding protection
grep -rn "Host.*header\|origin.*check\|validateHost\|127\.0\.0\.1" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py"

# Filesystem scope в MCP Filesystem-подобных серверах
grep -rn "allowedDirectories\|allowed_paths\|roots\[" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py"
```

## Классификация находок

| Находка | Severity |
|---|---|
| RCE через command injection в tool handler | Critical |
| mcp-remote версии 0.0.5–0.1.15 (CVE-2025-6514) | Critical |
| mcp-server-git версии до фикса CVE-2025-68143/68144/68145 | Critical |
| Long-lived admin token передаётся в MCP-сервер с untrusted content в контексте | Critical |
| Cross-tenant доступ через MCP tool | Critical |
| Отсутствие human-in-the-loop для destructive операций | High |
| Tool poisoning / отсутствие пиннинга версий | High |
| Session ID в URL на SSE transport | High |
| DNS rebinding-уязвимый локальный HTTP-сервер | High |
| Path traversal в tool handler | High |
| Нет hash-проверки tool definitions между сессиями | Medium |
| Общий service account на несколько MCP-серверов | Medium |
| Нет MCP Gateway, tools подключены напрямую | Medium |
| Нет allowlist tools в конфигурации клиента | Medium |
| MCP Inspector на 0.0.0.0 без auth в dev-окружении | Medium |

## Reference CVE и инциденты

| ID | Описание | Дата |
|---|---|---|
| CVE-2025-6514 | mcp-remote RCE через authorization_endpoint, CVSS 9.6 | июль 2025 |
| CVE-2025-49596 | MCP Inspector: unauthenticated RCE, CVSS 9.4 | 2025 |
| CVE-2025-54136 | Cursor IDE «MCPoison»: persistent RCE через подмену одобренного конфига | 2025 |
| CVE-2025-68143/4/5 | mcp-server-git: git_init / argument injection / path bypass → RCE | 2025 |
| CVE-2025-59528 | Flowise CustomMCP XSS → RCE | апрель 2026 |
| CVE-2025-59536 | Claude Code: config injection (Hooks) + `.mcp.json` consent bypass; фикс ≥ 2.0.65 | 2026 |
| CVE-2026-21852 | Claude Code: кража API-ключа через proxy-редирект; фикс ≥ 2.0.65 | 2026 |
| OX Security «Mother of All AI Supply Chains» | STDIO config-to-exec на уровне SDK, 200k инстансов, 150M+ загрузок, 40+ CVE | 15–20 апреля 2026 |
| CVE-2026-33032 | nginx-ui «MCPwn»: 2 HTTP-запроса без auth → захват, CVSS 9.8, **активно эксплуатируется** | 2026 |
| CVE-2026-5058/5059 | aws-mcp-server: pre-auth RCE через OS command injection (2 точки), CVSS 9.8 | 2026 |
| CVE-2026-32211 | @azure-devops/mcp: auth bypass → repos/pipelines/API-ключи, CVSS 9.1 | апрель 2026 |
| CVE-2026-30615 | Windsurf: zero-click prompt injection через HTML → смена MCP-конфига; на май 2026 не исправлено | 2026 |
| CVE-2026-22252 | LibreChat: STDIO config-to-exec (из OX-раскрытия) | 2026 |
| CVE-2026-23744 | MCPJam Inspector: unauth endpoint на 0.0.0.0 устанавливает произвольный сервер | 2026 |
| CVE-2026-23523 | Dive MCP Host: первый host-layer CVE, malicious deeplink → конфиг на клиенте | 2026 |
| Asana MCP cross-tenant leak | Cross-tenant access через MCP-feature | июнь 2025 |
| GitHub MCP incident | Over-privileged PAT + untrusted issues → exfiltration | 2025 |
| ClawHavoc / ClawHub | 1 184 вредоносных skill-пакета в реестре OpenClaw, 9 CVE | февраль 2026 |
| Zen MCP path bypass | is_dangerous_path() exact-match bypass | 2025 |
| Cursor .cursor/mcp.json case bypass | Case-insensitive FS → malicious server injection | 2025 |
