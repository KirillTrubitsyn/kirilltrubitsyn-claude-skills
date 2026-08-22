# Первичные источники

Базовая проверка списка выполнена 2026-08-22. Перед каждым аудитом перепроверять актуальную версию и фиксировать дату доступа. Ссылаться на первичный источник; secondary source использовать только как lead.

## Application и API

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
  - На базовую дату latest stable: 5.0.0.
  - При ссылке указывать полный ID вида `v5.0.0-x.y.z`.
- OWASP Top 10: https://owasp.org/Top10/2025/
  - На базовую дату актуальная редакция: 2025.
  - Это awareness document, не полный verification standard.
- OWASP API Security Top 10: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
  - На базовую дату опубликованная редакция: 2023.
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/

## Identity

- NIST SP 800-63-4 landing page: https://csrc.nist.gov/pubs/sp/800/63/4/final
- NIST SP 800-63B-4: https://pages.nist.gov/800-63-4/sp800-63b.html

Проверять применимость assurance level и не превращать отдельную рекомендацию в универсальный finding.

## AI и agents

- OWASP Top 10 for LLM Applications 2026:
  https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
- OWASP Top 10 for Agentic Applications 2026:
  https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- NIST AI Risk Management Framework:
  https://www.nist.gov/itl/ai-risk-management-framework
- NIST AI RMF Generative AI Profile:
  https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- MITRE ATLAS:
  https://atlas.mitre.org/

## MCP

Версия спецификации — это дата в формате `YYYY-MM-DD`, и она входит в путь каждой страницы. Поэтому сначала определить действующую ревизию, и только потом строить ссылки.

- Specification root: https://modelcontextprotocol.io/specification/
- Changelog ревизии: `https://modelcontextprotocol.io/specification/<ревизия>/changelog`
- Authorization: `https://modelcontextprotocol.io/specification/<ревизия>/basic/authorization`
- Transports: `https://modelcontextprotocol.io/specification/<ревизия>/basic/transports`

На срез сверки текущей была ревизия `2026-07-28`; предыдущая — `2025-11-25`. Проверять актуальную в specification root, а не подставлять эти значения по памяти.

Аудит вести против той ревизии, которую реализует проверяемый клиент или сервер, а не против самой новой. Между ревизиями меняются не только формулировки: в `2026-07-28` из протокола убраны сессии (`Mcp-Session-Id`) и handshake `initialize`. Требование, взятое из чужой ревизии, даёт ложную находку в обе стороны — и пропуск, и выдуманный недостаток.

Различать нормативные `MUST/SHOULD` спецификации и tutorial guidance. Страницы разделов security-considerations относятся к соответствующей ревизии и меняются вместе с ней.

## Vulnerabilities и supply chain

Порядок предпочтения:

1. advisory производителя или maintainer;
2. GitHub Security Advisory / ecosystem advisory;
3. CISA KEV для известной эксплуатации;
4. NVD/CVE record;
5. OSV для нормализованного ecosystem range.

Точки входа:

- CISA Known Exploited Vulnerabilities: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- NVD: https://nvd.nist.gov/
- CVE Program: https://www.cve.org/
- GitHub Advisories: https://github.com/advisories
- OSV: https://osv.dev/

Для каждого CVE/advisory записать:

- ID и primary URL;
- ecosystem и точное имя package/product;
- affected range;
- fixed range или отсутствие исправления;
- дату последней проверки;
- KEV/exploitation status;
- установленную версию;
- reachability и локальные компенсирующие controls.

Не поддерживать статический годовой watchlist внутри скилла и не переносить severity advisory напрямую в локальный отчёт.

## Secure development

- NIST Secure Software Development Framework:
  https://csrc.nist.gov/projects/ssdf
- SLSA:
  https://slsa.dev/spec/
- OpenSSF Scorecard:
  https://scorecard.dev/

Использовать только релевантные controls; отсутствие конкретного артефакта не всегда означает уязвимость.

## Regulation и compliance

- EU law, consolidated texts: https://eur-lex.europa.eu/
- EU AI Act official text:
  https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- EU Cyber Resilience Act official text:
  https://eur-lex.europa.eu/eli/reg/2024/2847/oj
- PCI Security Standards Council:
  https://www.pcisecuritystandards.org/
- Официальное опубликование правовых актов РФ:
  http://publication.pravo.gov.ru/

Перед выводом проверить текущую редакцию, transition rules, роль организации и фактическую применимость. Не считать proposal или пресс-релиз действующим правом.

## Правила цитирования

- Ставить ссылку рядом с поддерживаемым утверждением.
- Указывать версию/редакцию и дату доступа.
- Не цитировать search results вместо документа.
- Для изменчивого утверждения прямо писать `проверено YYYY-MM-DD`.
- Если источник недоступен, не заменять подтверждение уверенной формулировкой.

Первичный источник бывает недостижим из рабочего окружения: закрытый egress, отсутствие сети, требование авторизации. Это не повод перейти на память. Пометить утверждение как `не проверено`, назвать недостижимый источник и указать, какой вывод от него зависит. Вторичный источник в этом случае — лид для последующей проверки, а не подтверждение: на нём нельзя основывать severity, вывод о применимости требования или заявление о версии.
