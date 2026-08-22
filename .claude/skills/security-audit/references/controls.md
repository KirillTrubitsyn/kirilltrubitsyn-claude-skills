# Контрольные семейства

Использовать этот файл для выбора релевантных областей аудита. Это не линейный чек-лист: сначала определить архитектуру и trust boundaries, затем проверять только применимые контролы.

## Содержание

1. Архитектура и поверхность атаки
2. Идентификация и аутентификация
3. Авторизация и изоляция
4. Ввод, интерпретация и вывод
5. API и бизнес-операции
6. Данные, файлы и хранилища
7. Секреты и криптография
8. Клиентская часть
9. Цепочка поставок
10. Инфраструктура и deployment
11. CI/CD
12. Логи, мониторинг и ошибки
13. Устойчивость
14. Privacy и governance

## 1. Архитектура и поверхность атаки

Проверить:

- какие компоненты доступны извне, из внутренних сетей и только локально;
- где проходят границы tenant, пользователя, администратора, сервиса и стороннего поставщика;
- какие процессы обладают сетевыми, файловыми, облачными и database-привилегиями;
- согласованы ли фактические routes, listeners, jobs, webhooks и management endpoints с документацией;
- нет ли забытых версий API, debug endpoints, тестовых сервисов и обходных путей;
- какой компонент действительно обеспечивает каждый критический контроль.

Доказательства: схема компонентов, route registration, deployment manifests, ingress, IAM, middleware order, data-flow trace.

Не объявлять проблемой сам факт существования публичного endpoint. Нужно доказать отсутствие ожидаемого контроля или опасное воздействие.

## 2. Идентификация и аутентификация

Проверить:

- enrollment, login, logout, recovery, смену факторов и удаление аккаунта;
- устойчивость к enumeration, credential stuffing, replay и session fixation;
- MFA/passkeys для рискованных ролей и операций;
- проверку issuer, audience, signature algorithm, expiry, nonce/state и redirect URI там, где они применимы;
- серверное прекращение сессий после компрометации, выхода, смены факторов и изменения привилегий;
- безопасное хранение паролей и токенов;
- отсутствие доверия к неподписанным client-side claims.

Не использовать универсальные TTL или правила сложности пароля как автоматические finding. Сопоставить политику с моделью риска, актуальным NIST guidance и возможностями выбранного identity provider.

## 3. Авторизация и изоляция

Проверить:

- object-level, function-level и property-level authorization;
- deny-by-default и enforcement на сервере для каждого канала доступа;
- межтенантную изоляцию в API, фоновых задачах, кэше, поиске, storage и аналитике;
- проверку владения после преобразования внешнего идентификатора во внутренний объект;
- массовые операции, exports, admin impersonation и service-to-service calls;
- согласованность application checks с database/storage/IAM policies;
- TOCTOU между проверкой полномочий и действием.

Последовательный ID, UUID, slug или opaque token не является контролем доступа. Finding требует доказательства обхода либо отсутствия обязательной проверки.

## 4. Ввод, интерпретация и вывод

Проверить потоки в:

- SQL/ORM, shell, template, expression language, deserialization и dynamic code loading;
- HTML, DOM, email, CSV, PDF и другие контексты вывода;
- filesystem paths, archives, uploads и content-type handling;
- URL fetchers, redirects, proxies, webhooks и metadata services;
- parsers сложных форматов и сторонние преобразователи.

Искать не строку `sanitize`, а контекстную защиту у sink: параметризацию, allowlist, безопасный API, output encoding, canonicalization, sandbox и privilege separation.

Для SSRF проверить scheme/host/port policy, DNS rebinding, redirects, IPv4/IPv6 variants, link-local/private ranges, proxy behavior и egress controls. Активный запрос выполнять только по правилам `active-test`.

## 5. API и бизнес-операции

Проверить:

- полную инвентаризацию версий, hosts, GraphQL schemas, webhooks и callbacks;
- rate/concurrency/cost controls на уровне субъекта и дорогостоящего ресурса;
- idempotency и защиту от повторного выполнения;
- state transitions и невозможность пропустить обязательный этап;
- цену, количество, валюту, скидки, entitlement и лимиты на доверенной стороне;
- race conditions и параллельные изменения баланса/остатка;
- подпись, freshness и replay-защиту webhook;
- безопасное потребление сторонних API и недоверие к их данным;
- mass assignment, excessive response fields и фильтрацию по полям.

GraphQL introspection, REST-стиль или конкретный формат ID сами по себе не определяют severity.

## 6. Данные, файлы и хранилища

Проверить:

- классификацию данных, минимизацию, retention и удаление;
- encryption in transit/at rest и реальные границы управления ключами;
- database roles, grants, row/tenant policies и доступ сервисных аккаунтов;
- backup, snapshots, replicas, logs и тестовые копии;
- bucket/container policies, anonymous access и signed URL scope;
- upload size, MIME/content validation, malware workflow и изоляцию обработки;
- archive traversal, symlink/hardlink behavior и безопасные временные файлы;
- deletion semantics, legal hold и восстановимость.

RLS, signed URL TTL, soft delete и конкретный storage vendor оценивать в контексте. Отсутствие одного механизма может компенсироваться другой доказанной границей.

## 7. Секреты и криптография

Проверить:

- попадание секретов в исходники, history, images, artifacts, frontend bundles, logs и examples;
- источник конфигурации, workload identity и минимальные privileges;
- разделение dev/test/prod и tenant-specific credentials;
- отзыв, аварийную ротацию и audit trail;
- безопасные primitives и отсутствие самодельной криптографии;
- nonce/IV generation, authenticated encryption, key derivation и integrity;
- trust store, TLS validation и certificate lifecycle.

Сканирование истории не должно печатать значение секрета. Не устанавливать secret scanner без разрешения; использовать уже доступный инструмент либо безопасный поиск с редактированием результата.

## 8. Клиентская часть

Проверить:

- DOM sinks, unsafe HTML, URL navigation и cross-window messaging;
- CSP и Trusted Types как дополнительные слои, а не замену безопасному выводу;
- cookie flags и отсутствие чувствительных токенов в доступном JavaScript storage;
- CSRF для cookie-authenticated state changes;
- CORS как browser policy, не как серверную авторизацию;
- dependency loading, integrity и third-party scripts;
- service workers, caches, offline data и logout cleanup;
- отсутствие секретов и внутренних данных в bundles, maps и telemetry.

Публичность исходного frontend-кода ожидаема. Source maps становятся finding при раскрытии закрытых данных, credentials или иных доказанных рисков.

## 9. Цепочка поставок

Проверить:

- manifests, lockfiles, registries, mirrors и reproducible install;
- provenance, signatures/attestations и release permissions;
- lifecycle/install scripts, build plugins и downloaded binaries;
- abandoned, typosquatted, compromised и unexpectedly replaced packages;
- reachability уязвимого компонента и runtime exposure;
- container base images, actions, reusable workflows и pinned references;
- SBOM/VEX там, где они полезны или обязательны;
- процесс triage advisory и emergency update.

Не полагаться только на CVSS или вывод одного scanner. Для каждого dependency finding подтвердить ecosystem, package identity, installed version, affected/fixed range, источник advisory и локальную достижимость. Live-запросы к registry/advisory требуют разрешённой сети.

## 10. Инфраструктура и deployment

Проверить:

- IAM и separation of duties;
- network exposure, ingress/egress, private services и administrative ports;
- hardened runtime, non-root, capabilities, sandboxing и read-only filesystem;
- secret injection и отсутствие credentials в image layers;
- TLS termination, proxy trust и forwarded headers;
- cloud metadata access и workload identity;
- infrastructure state, drift и manual changes;
- DNS/email security только если эти активы входят в scope;
- безопасные production defaults и отсутствие debug mode.

Не считать конкретный заголовок, orchestrator или gateway обязательным без модели угроз. Проверять фактический контроль и воздействие.

## 11. CI/CD

Проверить:

- кто может менять workflow, protected branches, environments и release artifacts;
- privileges токенов, fork/PR trust boundaries и untrusted checkout;
- injection через branch names, issue text, artifacts, cache keys и outputs;
- pinning и provenance сторонних actions/plugins;
- OIDC audience/subject constraints и отказ от долгоживущих cloud keys;
- разделение build, sign и deploy;
- artifact integrity, retention и доступ;
- возможность обойти обязательные checks.

Запуск pipeline, публикация, создание branch/commit или изменение settings не входят в read-only аудит.

## 12. Логи, мониторинг и ошибки

Проверить:

- события аутентификации, авторизации, изменения ролей, секретов и критических операций;
- неизменяемость, retention, доступ и временную синхронизацию;
- correlation IDs без превращения их в bearer credentials;
- обнаружение abuse, необычного egress, массового доступа и control-plane changes;
- alert ownership и проверяемые response playbooks;
- отсутствие секретов, полных tool arguments, sensitive prompts и лишних персональных данных;
- безопасные внешние ошибки и достаточный внутренний контекст;
- fail-closed/fail-safe поведение при timeout, partial failure и недоступности policy service.

Логировать решение политики, субъект, действие, результат и безопасные метаданные. Не требовать полного тела запроса или полного AI tool output.

## 13. Устойчивость

Проверить:

- bounded input, output, memory, CPU, execution time и queue depth;
- backpressure, circuit breakers и per-tenant isolation;
- retry storms, duplicate delivery и poison messages;
- graceful degradation и отсутствие bypass при отказе зависимостей;
- atomicity, rollback и consistency критических операций;
- quota/cost controls для внешних и AI-сервисов.

Нагрузочное тестирование — отдельный активный режим. Статический аудит может подтвердить наличие или отсутствие ограничителей, но не фактическую пропускную способность.

## 14. Privacy и governance

Проверить технические доказательства:

- data inventory, purpose limitation и access model;
- consent/notice signals там, где применимо;
- retention/deletion workflows и обработку запросов субъектов;
- cross-border flows и processors/subprocessors;
- модельные данные, prompts, feedback, telemetry и human review;
- auditability автоматизированных решений;
- evidence ownership и change management.

Не делать юридический вывод только из кода. Для compliance-запроса перейти к [compliance.md](compliance.md).

## Завершение доменной проверки

Для каждого выбранного семейства записать:

- статус покрытия: `Reviewed`, `Partial`, `Not tested` или `Not applicable`;
- просмотренные компоненты и типы доказательств;
- пропущенные проверки и причину;
- связанные findings и подтверждённые сильные контролы.
