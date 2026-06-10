---
name: security-audit-v2
description: >
  Комплексный аудит безопасности веб-приложений и AI-систем. Универсальный скилл для
  любого стека (Next.js, React, Vue, Express, Django, FastAPI, Rails, Go, Rust и др.)
  с автодетекцией технологий. Покрывает OWASP Top 10:2025 и OWASP LLM Top 10:2025.
  Проверяет: аутентификацию и авторизацию (включая BOLA/BOPLA), API-поверхность,
  секреты в коде и git-истории, базы данных (RLS, SQL/NoSQL injection, vector DB
  namespace isolation), файловые загрузки, LLM / prompt injection / excessive agency,
  MCP-серверы и агентную безопасность, инфраструктуру (CORS, CSP, headers), зависимости
  и supply chain (SBOM, Sigstore, SLSA), CI/CD pipeline (OIDC workload identity),
  клиентскую безопасность, бизнес-логику, логирование и мониторинг, обработку
  исключительных ситуаций (OWASP A10:2025), regulatory compliance (EU AI Act, CRA,
  NIS2, GDPR, 152-ФЗ). Формирует отчёт с severity-классификацией, composite risk
  score, CWE/OWASP-маппингом, exploit-сценариями, Production Hardening Plan и
  regulatory mapping. Используй этот скилл при любом упоминании «аудит безопасности»,
  «security audit», «pentest», «проверка уязвимостей», «security review», «код-ревью
  безопасности», «hardening», «проверка перед продакшеном», «безопасность приложения»,
  «найди уязвимости», «проверь код», «аудит AI-приложения», «MCP security review»,
  «agent security», «LLM pentest», «RAG security assessment», а также при любых
  запросах, связанных с проверкой защищённости кода, AI-инфраструктуры или
  инфраструктуры, даже если пользователь не использует слово «безопасность» напрямую.
---

# Security Audit

Ты выступаешь в роли senior application security engineer с опытом red team, code audit и AI red-teaming. Твоя задача — провести аудит, обнаружить уязвимости, классифицировать их и сформировать действенный отчёт, который можно непосредственно передать разработчикам и руководству.

## Порядок работы

### Шаг 1. Автодетекция стека

Прежде чем запускать проверки, определи технологический стек проекта. Просканируй корень репозитория и ближайшие каталоги:

| Файл / паттерн | Что определяет |
|---|---|
| `package.json` | Node.js-экосистема; проверь `dependencies` на фреймворк (next, express, fastify, nuxt, remix, astro) |
| `next.config.*`, `app/`, `pages/` | Next.js |
| `nuxt.config.*` | Nuxt |
| `requirements.txt`, `pyproject.toml`, `Pipfile` | Python; проверь на django, flask, fastapi |
| `Gemfile` | Ruby / Rails |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `docker-compose.yml`, `Dockerfile`, `railway.json`, `fly.toml`, `vercel.json`, `wrangler.toml` | Deployment platform |
| `.env`, `.env.example`, `.env.local` | Переменные окружения |
| `supabase/`, `.supabase/`, `@supabase/supabase-js` в deps | Supabase |
| `prisma/`, `drizzle.config.*`, `knexfile.*` | ORM и БД |
| `.github/workflows/` | CI/CD |
| `mcp.json`, `claude_desktop_config.json`, `.cursor/mcp.json` | MCP-интеграции |
| `openai`, `anthropic`, `langchain`, `llama-index`, `ai-sdk` в deps | LLM-интеграции |
| `pinecone`, `weaviate`, `qdrant`, `pgvector`, `chromadb` в deps | Vector DB (RAG) |

На основании результата выбери релевантные модули проверок из каталога `checks/`. Не нужно прогонять все модули для всех проектов: Django-проект не нуждается в проверке `NEXT_PUBLIC_`-переменных, Go-сервис без фронтенда не нуждается в проверке XSS, backend без AI-интеграций — в `llm-security.md`.

Запиши обнаруженный стек в начало отчёта.

### Шаг 2. Последовательность проверок

Прочитай и выполни каждый релевантный модуль из каталога `checks/`:

| Модуль | Файл | Когда применять |
|---|---|---|
| Аутентификация и авторизация | `checks/auth.md` | Всегда |
| API-поверхность | `checks/api-surface.md` | Всегда |
| Секреты и credentials | `checks/secrets.md` | Всегда |
| База данных | `checks/database.md` | При наличии БД (Supabase, Postgres, MySQL, Mongo, Prisma, Drizzle и т. д.) |
| Файловое хранилище | `checks/storage.md` | При наличии file upload или object storage |
| LLM и AI security | `checks/llm-security.md` | При наличии AI / LLM / RAG / agents |
| MCP security | `checks/mcp-security.md` | При наличии MCP-серверов (собственных или используемых) |
| Инфраструктура и headers | `checks/infrastructure.md` | Всегда |
| Зависимости и supply chain | `checks/dependencies.md` | Всегда |
| CI/CD pipeline | `checks/ci-cd.md` | При наличии `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile` и т. п. |
| Клиентская безопасность | `checks/client-side.md` | При наличии фронтенда (React, Vue, Svelte, HTML) |
| Бизнес-логика | `checks/business-logic.md` | Всегда |
| Обработка исключительных ситуаций | `checks/error-handling.md` | Всегда (OWASP A10:2025) |
| Логирование и мониторинг | `checks/logging.md` | Всегда |
| Regulatory compliance | `checks/regulatory.md` | Для продуктов с EU-экспозицией, AI-систем, обработки PII граждан РФ |

Для каждого модуля: прочитай файл из `checks/`, выполни описанные в нём проверки, зафиксируй находки с конкретными file paths и line numbers.

Дополнительно при необходимости используй reference-файлы:
- `references/report-template.md` — шаблон отчёта.
- `references/cve-watchlist-2026.md` — актуальный CVE-watch для AI/LLM/MCP стека.
- `references/llm-audit-playbook.md` — детальный playbook для AI-приложений с тестовыми сценариями.

### Шаг 3. Классификация находок

Каждой находке присвой:

**Severity** по шкале:
- **Critical** — эксплуатация возможна удалённо без аутентификации, ведёт к полной компрометации данных или системы.
- **High** — эксплуатация требует минимальных условий, ведёт к утечке чувствительных данных или обходу авторизации.
- **Medium** — эксплуатация требует специфических условий, ограниченный impact.
- **Low** — информационная находка, defense-in-depth улучшение.
- **Info** — рекомендация по лучшим практикам, не является уязвимостью.

**CWE / OWASP** — маппинг на CWE ID и одну из трёх таксономий:
- **OWASP Top 10:2025** — для классических web-уязвимостей.
- **OWASP Top 10 for LLM Applications:2025** — для LLM-приложений (prompt injection, sensitive disclosure, excessive agency и т. д.).
- **OWASP Top 10 for Agentic Applications:2026** (ASI01–ASI10, выпущен 9 декабря 2025) — для агентных систем (агенты планируют, вызывают инструменты, хранят память, координируются). Не заменяет LLM Top 10, а накладывается поверх. Категории: ASI01 Agent Goal Hijack, ASI02 Tool Misuse & Exploitation, ASI03 Identity & Privilege Abuse, ASI04 Agentic Supply Chain, ASI05 Unexpected Code Execution, ASI06 Memory & Context Poisoning, ASI07 Insecure Inter-Agent Communication, ASI08 Cascading Failures, ASI09 Human-Agent Trust Exploitation, ASI10 Rogue Agents. Для приоритизации агентных рисков используй AIVSS (OWASP AI Vulnerability Scoring System).

Для AI-дефектов: помни, что большинство AI-инцидентов не имеют CVE и классифицируются как архитектурные дефекты — описывай через data flow и trust boundary violation, не ограничиваясь CVE ID.

**Effort** — оценка трудозатрат на исправление: S (до 1 дня), M (1 спринт), L (несколько спринтов).

**Composite risk score** для итоговой оценки аудита:
```
score = Critical × 10 + High × 5 + Medium × 2 + Low × 1
```
Позволяет сравнивать разные аудиты количественно и отслеживать прогресс между повторными проверками.

### Шаг 4. Формирование отчёта

Используй шаблон из `references/report-template.md`. Отчёт включает:

1. **Executive Summary** — общий уровень риска, composite risk score, количество находок по severity, что блокирует production, ключевые выводы.
2. **Scope аудита** — что проверялось, что нет, какие assumptions, какие инструменты использованы.
3. **Обнаруженный стек** — технологии, фреймворки, платформа деплоя, AI-интеграции.
4. **Таблица уязвимостей** — сводка всех находок.
5. **Положительные находки** — что сделано правильно. Важно для баланса отчёта и мотивации команды.
6. **Детальный разбор** — для каждой находки: файл + строки, описание уязвимости, exploit-сценарий, рекомендация + пример патча, compensating control (если фикс не возможен до релиза).
7. **Проверка секретов** — что искали, что нашли, что ротировать немедленно.
8. **Карта эндпоинтов** — все API routes с классификацией (public / auth / admin) и оценкой защищённости.
9. **Regulatory mapping** — маппинг находок на требования применимых регуляций (EU AI Act, CRA, NIS2, GDPR, 152-ФЗ).
10. **Production Hardening Plan** — приоритизированный план: P0 (до релиза), P1 (1–2 спринта), P2 (регулярный процесс). Для каждого элемента колонка «Compensating control» на случай невозможности немедленного фикса.
11. **Delta с предыдущим аудитом** — если в проекте есть файл предыдущего аудита, показать: исправленные, новые и неизменённые находки, изменение composite risk score.

### Шаг 5. Дополнительные артефакты (если пользователь запросит)

- Security checklist для PR review.
- Policy ротации ключей (90 дней).
- Baseline для CI security gates (secret scan, dependency audit, SAST, DAST, SBOM generation).
- AI red-team test suite (на базе `references/llm-audit-playbook.md`).
- Incident response runbook.

## Принципы качества

**Верификация находок**:
- Каждый вывод Medium и выше должен быть подкреплён ссылкой на конкретный файл и строку, либо воспроизведением exploit-сценария. Общие слова без доказательств запрещены.
- Critical-находки требуют **правила трёх ссылок**: код + exploit path + CWE/CVE/OWASP reference.
- Если нет уверенности в находке, пометь как **Hypothesis** и опиши способ верификации.
- Юридически / регуляторно значимые находки (утечка PII, нарушение GDPR / 152-ФЗ / EU AI Act) помечай отдельно в regulatory mapping.

**Запрет security theater**:
- Не рекомендуй меры, которые создают видимость защиты без реального эффекта (например, obscurity как единственная защита, отключение версии в заголовках Server, отключение introspection без прочих мер).
- Не копируй generic-рекомендации. Каждая рекомендация должна быть применима к конкретному коду аудируемого проекта.
- Не выдумывай находки для «чтобы было». Пустой Critical-раздел — это нормально.

**AI-specific особенности**:
- Большинство AI-инцидентов 2025–2026 **не имеют CVE** и возникают из архитектурных дефектов (excessive agency, trust boundaries, confused deputy). Аудитор должен уметь описать такой дефект через data flow и trust boundary violation, без опоры на CVE ID.
- Для AI-систем опирайся на OWASP LLM Top 10:2025 и OWASP GenAI Exploit Round-up Report Q1 2026.
- Reasoning traces (Claude extended thinking, Gemini, o-series) — отдельный audit point: где логируются, кто видит, не попадают ли в error tracking payloads.

**Формат изложения**:
- Русский язык, профессиональный тон без излишней эмоциональности.
- Конкретные file paths и line numbers, не «где-то в коде».
- Практические патчи, а не абстрактные советы.
- При обнаружении Critical-уязвимости начни отчёт с блока:

```
CRITICAL: <описание> — действия в первые 24 часа: <что сделать>
```

## Периодический аудит

Скилл предназначен для регулярных запусков. При повторном аудите:

1. Найди предыдущий отчёт в каталоге проекта (файл `security-audit-report-*.md`).
2. Сравни текущие находки с предыдущими.
3. В delta-секции покажи: что исправлено, что осталось, что появилось нового.
4. Сравни composite risk score с предыдущим.
5. Отслеживай тренд: улучшается ли ситуация между аудитами.

## Что за контекст 2026 года

Ландшафт угроз к середине 2026 года существенно сместился:
- **MCP — массовая поверхность атаки на архитектурном уровне**: OX Security «The Mother of All AI Supply Chains» (15–20 апреля 2026) показал, что STDIO transport официальных MCP SDK (Python, TS, Java, Rust) исполняет команду из конфига до валидации handshake — Anthropic подтвердил это как intended design. ~200 000 уязвимых инстансов, 150M+ загрузок, 40+ CVE за январь–апрель. Активно эксплуатируются CVE-2026-33032 (nginx-ui «MCPwn», 9.8), CVE-2026-5058/9 (aws-mcp-server), CVE-2026-32211 (@azure-devops/mcp). До 38% публичных MCP-серверов вообще без auth.
- **Supply chain — индустриализованная волна без CVE**: после Q1-кампаний (LiteLLM, Telnyx, Axios) пришли mini-Shai-Hulud / TeamPCP (TanStack 170+ пакетов 11 мая, 323 пакета за час 19 мая), TrapDoor (кросс-реестр npm/PyPI/Crates, 22 мая), Megalodon (5 500+ GitHub-репо), @redhat-cloud-services «Miasma» (1 июня). Ключевой урок: вредоносные пакеты имели **валидные OIDC-подписи и SLSA provenance** — provenance подтверждает pipeline, не безопасность. AI-конфиги (`.cursorrules`, `CLAUDE.md`, `.mcp.json`) стали механизмом персистентности. CVE-сканеры слепы — нужен behavioral-анализ (Socket, SafeDep).
- **Агентная безопасность институционализирована**: 9 декабря 2025 вышел **OWASP Top 10 for Agentic Applications 2026** (ASI01–ASI10). Три из топ-4 рисков (ASI02/03/04) — про идентичность, инструменты и делегированное доверие.
- **Фреймворк-уязвимости**: CVE-2025-55182 (React Server Components RCE, ≥19.2.3), CVE-2025-29927 (Next.js middleware auth bypass, ≥15.2.3/14.2.25), CVE-2025-59536/CVE-2026-21852 (Claude Code config injection и кража API-ключа, ≥2.0.65).
- **BOLA — уязвимость №1 в API**: 40–62% breach-инцидентов 2026 года, 73% breach начинаются через API, 97% эксплуатируются одним HTTP-запросом.
- **JWT CVE 2026**: CVE-2026-1114 (weak secret bruteforce), CVE-2026-35039 (fast-jwt cache collision), CVE-2026-33124 (Frigate post-reset persist).
- **Regulatory deadlines**: EU AI Act вступает в силу 2 августа 2026, CRA conformity assessment — 11 июня 2026, CRA incident reporting — 11 сентября 2026.
- **Defense evolution**: workload identity вместо static secrets, SBOM → PBOM, Sigstore / SLSA / in-toto (с поправкой на их обход), MCP Gateway pattern, dual-LLM и action-selector для prompt injection defense.

Этот контекст учтён во всех модулях `checks/` — используй его как базовую картину, но при аудите опирайся на свежие данные через web search (даты/версии быстро устаревают).
