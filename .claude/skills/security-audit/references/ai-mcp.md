# Аудит AI, agents, RAG и MCP

Читать этот файл, если система использует LLM, embeddings, retrieval, tools, long-term memory, автономное планирование, несколько агентов или Model Context Protocol.

## Содержание

1. Выбор модели угроз
2. Общая граница безопасности
3. LLM и RAG
4. Agentic-системы
5. MCP
6. Безопасная проверка
7. Доказательность findings

## 1. Выбор модели угроз

На базовую дату источников использовать:

- OWASP Top 10 for LLM Applications 2026 для приложений, где модель является компонентом;
- OWASP Top 10 for Agentic Applications 2026, если модель планирует, использует инструменты, хранит память, взаимодействует с другими агентами или совершает действия;
- актуальную версию MCP Specification для MCP client/server;
- обычные ASVS/API/supply-chain контролы для окружающего приложения.

Перед отчётом проверить, не опубликованы ли новые версии. Ссылки и правила актуализации находятся в [sources.md](sources.md).

LLM Top 10:2026:

1. LLM01 Prompt Injection
2. LLM02 Sensitive Information Disclosure
3. LLM03 Excessive Agency
4. LLM04 Supply Chain
5. LLM05 Data and Model Poisoning
6. LLM06 Unbounded Consumption
7. LLM07 Misinformation
8. LLM08 Hidden Context Exposure
9. LLM09 Vector and Embedding Weaknesses
10. LLM10 Improper Output Handling

Agentic Top 10:2026:

1. ASI01 Agent Goal Hijack
2. ASI02 Tool Misuse and Exploitation
3. ASI03 Identity and Privilege Abuse
4. ASI04 Agentic Supply Chain Vulnerabilities
5. ASI05 Unexpected Code Execution
6. ASI06 Memory and Context Poisoning
7. ASI07 Insecure Inter-Agent Communication
8. ASI08 Cascading Failures
9. ASI09 Human-Agent Trust Exploitation
10. ASI10 Rogue Agents

Это классификация рисков, а не десять автоматических findings.

## 2. Общая граница безопасности

Считать prompt injection внутренним свойством недоверенного естественного языка, а не полностью устранимой ошибкой фильтрации. Проектировать систему так, будто модель иногда последует вредоносной инструкции.

Основные гарантии должны находиться вне модели:

- минимальные полномочия и отдельная identity для каждого агента;
- allowlist действий, ресурсов и destinations;
- детерминированная авторизация непосредственно перед tool call;
- schema validation и semantic validation аргументов;
- подтверждение человеком для высокорисковых и необратимых действий;
- isolation между tenant, session, task и memory;
- budgets на время, токены, стоимость, шаги и внешние вызовы;
- журналирование решений и действий без секретов;
- безопасная отмена, rollback либо compensation.

System prompt, XML delimiters, classifier, guardrail model и output filter — полезные слои, но не самостоятельная граница полномочий.

## 3. LLM и RAG

### Входы и контекст

Проверить происхождение и trust label каждого источника:

- пользовательский ввод;
- retrieved documents и web content;
- system/developer instructions;
- tool descriptions и tool results;
- conversation history и summaries;
- memory;
- fine-tuning/evaluation data;
- скрытые metadata и шаблоны.

Недоверенный контент не должен незаметно становиться инструкцией более высокого уровня. Проверить границы между tenants, projects, sessions и documents.

### Retrieval и embeddings

Проверить:

- права доступа до retrieval и после фильтрации результатов;
- tenant-aware indexing и cache keys;
- provenance документа, версию и право на удаление;
- ingestion validation и защиту от poisoning;
- обработку hidden text, metadata и indirect prompt injection;
- целостность index/embedding pipeline;
- безопасное объединение нескольких источников;
- отсутствие утечки соседних chunks или закрытых metadata;
- оценку качества retrieval на положительных и отрицательных fixtures.

Не применять универсальные пороги cosine similarity, z-score или процент poisoning. Порог должен следовать из измеренной модели данных и acceptance tests конкретной системы.

### Вывод модели

Считать вывод модели недоверенными данными. Проверить его путь к:

- HTML/Markdown rendering;
- SQL, shell, templates и interpreters;
- filesystem и URL;
- email/messages;
- code execution;
- downstream API;
- человеческому решению с финансовыми, медицинскими, юридическими или иными значимыми последствиями.

Нужны контекстная обработка, schema validation, policy check и confirmation в зависимости от sink.

### Конфиденциальность и hidden context

Проверить:

- что модель реально получает, включая framework-added context;
- попадание секретов, закрытых prompts, retrieval metadata и персональных данных;
- provider retention/training settings и region;
- debug traces, observability, caches и feedback datasets;
- возможность inference/extraction через многократные запросы;
- минимизацию контекста и redaction до вызова модели.

Утечка текста system prompt не всегда равна утечке секрета. Severity зависит от содержащихся данных и последующего воздействия.

### Consumption и отказоустойчивость

Проверить:

- limits на input/output, context, iterations, recursive delegation и parallel tools;
- per-user/per-tenant budgets и expensive model routing;
- cancellation, timeout, retry и circuit breaker;
- обработку oversized documents и decompression;
- защиту от unbounded loops и cascading calls;
- fallback без отключения ключевых политик.

## 4. Agentic-системы

### Цель и план

Проверить, кто может задавать и изменять goal, какие инструкции считаются доверенными, как обнаруживается goal drift и может ли внешний контент изменить план незаметно для пользователя.

### Инструменты и полномочия

Для каждого tool установить:

- identity и scope;
- разрешённые ресурсы, verbs и destinations;
- server-side enforcement;
- validation аргументов;
- side effects и обратимость;
- необходимость human confirmation;
- timeout, output cap и error behavior;
- возможность tool chaining для обхода ограничений.

Описание tool для модели не заменяет серверную авторизацию.

### Память и состояние

Проверить provenance, tenant/session binding, write permissions, expiry, conflict handling, poisoning, redaction и возможность безопасно просмотреть/исправить/удалить память.

### Несколько агентов

Проверить взаимную идентификацию, авторизацию сообщений, integrity/provenance, delegation depth, separation of duties, shared-state races и ограничение каскадных ошибок.

### Человек в контуре

Confirmation должен описывать конкретное действие, target, данные и последствия. Избегать fatigue и универсального `Approve`. Не выдавать модельный текст или citation за проверенный факт без provenance.

## 5. MCP

Сначала определить transport: STDIO, Streamable HTTP или иной. Не переносить HTTP OAuth-модель на STDIO автоматически.

### HTTP authorization

Если защищённый HTTP MCP поддерживает authorization, сверить реализацию с актуальной спецификацией:

- OAuth 2.1 flow;
- Protected Resource Metadata и discovery authorization server;
- безопасная client registration strategy;
- PKCE с `S256` и точное сопоставление redirect URI;
- Resource Indicators (`resource`) и canonical server URI;
- проверка issuer, audience, expiry, signature и scopes;
- `Authorization` в каждом защищённом HTTP request;
- отсутствие access token в query string;
- запрет принимать или транзитить токены, выпущенные не для этого MCP resource;
- least privilege и step-up scopes;
- защита от confused deputy, open redirect и SSRF при metadata discovery.

Authorization может быть optional по протоколу, но отсутствие аутентификации на удалённом сервере с чувствительными ресурсами требует отдельной оценки модели угроз.

### Transport и sessions

Проверить:

- Origin validation для HTTP;
- bind на localhost для локальных HTTP servers;
- TLS и proxy trust для удалённых endpoints;
- непредсказуемый `MCP-Session-Id`, если sessions используются;
- привязку session к субъекту и невозможность использовать session ID как замену аутентификации;
- отсутствие пересечения tenant/task state;
- безопасное завершение и expiry session;
- ограничения requests, streams и server-sent events.

### STDIO и локальные servers

Проверить происхождение executable/package, команду запуска, environment credentials, filesystem permissions, наследуемые privileges, автообновление и возможность подмены бинарника. Не печатать environment values.

### Tools, resources, prompts и tasks

Проверить:

- строгие input schemas и дополнительную semantic validation;
- server-side authorization на каждое действие;
- roots/URI/path validation и canonicalization;
- allowlist сетевых destinations;
- защиту от command/argument injection;
- изоляцию task state и результатов;
- bounded output, timeouts и cancellation;
- безопасную обработку tool result клиентом;
- изменение tool metadata и supply-chain provenance;
- redaction логов.

Наличие или отсутствие MCP gateway, message signing или конкретного vendor-продукта само по себе не является finding.

## 6. Безопасная проверка

В `audit` и `verify`:

- использовать синтетические canary IDs, а не реальные секреты;
- направлять tool calls в stub/fake adapter;
- использовать fixtures без production data;
- проверять policy decision и заблокированное действие, а не только текст модели;
- ограничивать шаги, время, output и стоимость;
- не использовать команды удаления, persistence, credential access или внешнюю exfiltration;
- не отправлять массовые запросы.

Успешный ответ модели на фразу вроде `ignore previous instructions` не определяет severity. Нужно показать, какое защищённое действие, данные или граница стали доступны.

Любой тест работающей системы, внешнего URL или реального tool backend относится к `active-test`.

## 7. Доказательность findings

Сильное AI/MCP finding связывает:

`недоверенный источник → путь в контекст/аргумент → решение модели или protocol weakness → отсутствующий deterministic control → достижимое действие/раскрытие`.

Включить:

- точную конфигурацию/версию;
- роль атакующего;
- необходимые данные и privileges;
- безопасный trace или fixture;
- фактический effect;
- counter-evidence;
- blast radius;
- рекомендуемый контроль вне модели;
- regression test.

Если подтверждён только prompt behavior без security effect, оставить `Hypothesis` или `Informational`.
