# Зависимости и Software Supply Chain (OWASP A03:2025)

OWASP Top 10:2025 переименовал «Vulnerable and Outdated Components» в **«Software Supply Chain Failures»** (A03:2025) и существенно расширил scope. Это больше не только CVE в зависимостях — это весь процесс build / distribution / update. 2026 год показал, что supply chain — один из топ-векторов и что он индустриализуется: Q1 (TeamPCP: LiteLLM, Telnyx, Axios; Anthropic source map leak), затем волны mini-Shai-Hulud в мае (TanStack 170+ пакетов 11 мая, 323 пакета за час 19 мая), TrapDoor (кросс-реестр npm/PyPI/Crates, 22 мая), Megalodon (5 500+ GitHub-репо), @redhat-cloud-services «Miasma» (1 июня).

**Два урока 2026 года, меняющие методику проверки:**
1. **CVE-сканеры слепы к этому классу.** Phoenix MPI: 59 supply chain кампаний / 657 вредоносных package-IOC за 2024–2026 — ни одной не присвоен CVE во время активной эксплуатации. `npm audit` / `pip-audit` по CVE-фидам не поймают свежую кампанию. Обязателен **behavioral-анализ** (Socket, SafeDep, поведенческое сканирование зависимостей), а не только CVE-проверка.
2. **Provenance ≠ безопасность.** Майско-июньские пакеты имели **валидные OIDC Trusted Publishing подписи и SLSA-attestations** — атакующие захватывали GitHub Actions release pipeline, и аттестация честно подтверждала, что пакет собран этим pipeline (с уже внедрённой малварью). Проверка provenance остаётся полезной, но не является доказательством чистоты.

## Что проверять

### 1. Известные уязвимости (CVE)

Выполни аудит зависимостей:

```bash
# Node.js
npm audit --json 2>/dev/null | head -200 || yarn audit --json 2>/dev/null | head -200 || pnpm audit --json 2>/dev/null | head -200

# Python
pip-audit 2>/dev/null || safety scan 2>/dev/null

# Ruby
bundle audit check --update 2>/dev/null

# Go
govulncheck ./... 2>/dev/null

# Rust
cargo audit 2>/dev/null

# Общий SCA-сканер (если доступен)
trivy fs --scanners vuln . 2>/dev/null
osv-scanner --recursive . 2>/dev/null
```

Если инструмент аудита недоступен, проверь lockfile вручную: найди пакеты с устаревшими версиями и сверь с базами CVE (NVD, GitHub Advisory Database, osv.dev).

### 2. Supply chain attacks — приоритет 2026

Q1 2026 показал массовые атаки на maintainer-аккаунты и публикационные токены. Проверь защиту от known-паттернов:

- **Typosquatting**: проверь, нет ли подозрительных пакетов с именами, похожими на популярные (lodahs вместо lodash, expres вместо express).
- **Slopsquatting**: пакеты, которые часто hallucinate LLM (например, generated code импортирует несуществующий пакет, атакующий публикует malicious package с этим именем). Если есть code assistants — проверь generated dependency additions.
- **Maintainer takeover / wormable self-propagation**: атаки 2026 года (Axios, Shai-Hulud) крадут npm/GitHub-токены и автоматически бэкдорят все пакеты, которые жертва может публиковать. Проверяй pinning к SHA vs tag (см. пункт 4) и наличие publish-time 2FA + granular tokens у maintainers.
- **Lockfile integrity**: есть ли `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` / `poetry.lock` / `Cargo.lock` в репозитории? Без lockfile версии зависимостей недетерминированы. Сверяй lockfile с актуальным IOC-набором (Socket / SafeDep / Phoenix MPI), а не только с CVE.
- **Postinstall / preinstall scripts**: ищи пакеты с `postinstall` / `preinstall` скриптами. `npm ci --ignore-scripts` блокирует основной механизм доставки, **но есть обходы**: Phantom Gyp (`binding.gyp`) исполняется в обход флага; PackageGate (CVE-2025-69263) — malicious `.npmrc` в git-зависимости подменяет git-бинарь → RCE даже с флагом.
- **AI-конфиги как персистентность**: проверь, не добавляют ли подозрительные пакеты/PR файлы `.cursorrules`, `CLAUDE.md`, `.mcp.json`, git hooks, systemd/cron-записи — это стандартный механизм закрепления малвари TrapDoor и подобных кампаний.
- **Install-time malware detection**: используется ли Socket, SafeDep, Snyk Advisor, GitHub Dependency Review? Поведенческое сканирование обязательно — CVE-only недостаточно.

Reference-инциденты 2026 года, по которым можно делать свёрку:

| Инцидент | Дата | Вектор |
|---|---|---|
| LiteLLM PyPI (TeamPCP) | 24 марта 2026 | Credential exfiltration через Trivy CI/CD |
| Telnyx npm (TeamPCP) | 27 марта 2026 | Связано с LiteLLM-кампанией |
| Axios npm | 30 марта 2026 | Maintainer takeover, доставка RAT, wormable |
| Trivy-plugin-aqua | 22 марта 2026 | Deface 44 репозиториев |
| Anthropic Claude Code | 31 марта – 1 апреля 2026 | Public npm source map → fake repos с malware |
| Flowise CVE-2025-59528 | Эксплуатация с 7 апреля 2026 | 12k–15k инстансов, CustomMCP injection → RCE |
| TanStack / Mistral AI / UiPath / OpenSearch (mini-Shai-Hulud, TeamPCP) | 11 мая 2026 | Hijack GitHub Actions release pipeline; 170+ пакетов, 404 версии; валидные OIDC/SLSA |
| Maintainer `atool` (Shai-Hulud) | 19 мая 2026 | 639 версий / 323 пакета за час — рекорд по скорости |
| @bitwarden/cli 2026.4.0 (fake) | май 2026 | Импersonация CLI, самораспространение через публикуемые жертвой пакеты |
| TrapDoor (npm/PyPI/Crates) | 22–25 мая 2026 | 34 пакета / 384+ версии; персистентность через `.cursorrules`, `CLAUDE.md`, SSH; цель — crypto/DeFi/AI-разработчики |
| Megalodon | май 2026 | 5 500+ GitHub-репо, вредоносные Actions workflows, жатва CI/CD-секретов |
| @redhat-cloud-services «Miasma» | 1 июня 2026 | Компрометация GitHub-аккаунта сотрудника, orphan commits в обход review, валидный SLSA provenance |

### 3. SBOM (Software Bill of Materials)

Под EU Cyber Resilience Act с 11 декабря 2027 SBOM становится де-факто обязательным для EU-market продуктов, но уже сейчас — отраслевой стандарт.

- Генерируется ли SBOM при каждом build? В каком формате: SPDX 2.3+ или CycloneDX 1.5+?
- Хранится ли SBOM как артефакт CI/CD и доступен ли для audit?
- Включает ли SBOM транзитивные зависимости (не только direct)?
- Связан ли SBOM с vulnerability data (VEX — Vulnerability Exploitability eXchange)?
- Инструменты: `syft` для генерации, `grype` для анализа, `trivy sbom`, GitHub native SBOM export.

**Переход к PBOM (Production Bill of Materials)** — новый стандарт 2026: tracking не только source dependencies, но и того, что фактически попадает в production artifact (после tree-shaking, minification, bundling).

### 4. Pinning и артефакт integrity

- Direct dependencies в `package.json` / `requirements.txt` — используется ли pinning к конкретной версии, не `^1.2.3` / `~1.2.3` / `>= 1.0`?
- GitHub Actions: используются ли actions с пиннингом к SHA (`uses: actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29`) или к тегу (`uses: actions/checkout@v4`)? Теги мутабельны — автор может изменить, на что указывает тег.
- Git dependencies в `package.json` (`git+https://...`) — пинятся ли к commit SHA, не к branch?
- Container images: pinning к digest (`@sha256:...`), не к tag (`:latest`, `:v4`).

### 5. Supply chain hardening tools

Индустриальные стандарты, рекомендуемые Q1 2026:

- **Sigstore cosign**: cryptographic signing артефактов, публичные keys в transparency log. Проверь, подписаны ли релизные артефакты проекта.
- **SLSA (Supply-chain Levels for Software Artifacts)**: framework для уровней безопасности supply chain. Минимум SLSA Level 2 в production (build script + authenticated source + provenance). SLSA Level 3 — hosted build platform + non-falsifiable provenance.
- **in-toto attestations**: verify chain of custody от source до production artifact.
- **OpenSSF Scorecard**: автоматическая оценка security posture open-source проекта.
- **Dependabot / Renovate**: автоматические PR на обновление зависимостей.

### 6. Устаревшие зависимости

Критически устаревшие зависимости (более 2 major-версий назад) часто содержат незакрытые уязвимости. Проверь:
```bash
npm outdated 2>/dev/null
pip list --outdated 2>/dev/null
bundle outdated 2>/dev/null
```

### 7. Unused dependencies

Зависимости, которые установлены, но не используются в коде, расширяют поверхность атаки без пользы. Инструменты: `depcheck` (Node.js), `vulture` (Python), `knip`.

### 8. Внутренние зависимости и dependency confusion

- Если проект использует private npm registry или GitHub Packages: проверь `.npmrc` — нет ли auth tokens в файле?
- **Dependency confusion**: если имя внутреннего пакета не зарезервировано в публичном реестре, атакующий может опубликовать вредоносный пакет с тем же именем и при сборке npm/pip возьмёт публичный вариант. Защита: scoped packages (`@company/pkg`), явное указание `registry` per-scope, зарезервированные имена в public registry.

### 9. CVE-watch для AI/LLM stack

Поскольку проект часто использует AI-зависимости, отдельное внимание:
- LangChain: отслеживай CVE в chain-конструкциях, особенно с SQLDatabaseChain, PALChain.
- LlamaIndex: аналогично.
- Flowise: CVE-2025-59528 — RCE, активная эксплуатация. Обнови до 3.0.6+.
- mcp-remote: CVE-2025-6514 — RCE CVSS 9.6. Обнови до 0.1.16+.
- mcp-server-git: CVE-2025-68143 / 68144 / 68145 — chain → RCE.
- LiteLLM: если используется — проверь версию, не из компрометированного диапазона 1.82.7 / 1.82.8.
- Axios: проверь, не из диапазона мартовской компрометации.

## Как искать

```bash
# Lockfiles
ls -la package-lock.json yarn.lock pnpm-lock.yaml poetry.lock Cargo.lock Gemfile.lock go.sum 2>/dev/null

# Action pinning
grep -rn "uses:.*@v[0-9]" .github/workflows/ 2>/dev/null  # Теги — менее безопасно
grep -rn "uses:.*@[a-f0-9]\\{40\\}" .github/workflows/ 2>/dev/null  # SHA — хорошо

# Container image tags
grep -rn "FROM [a-z].*:[a-z]" Dockerfile* docker-compose*.yml 2>/dev/null | grep -v "@sha256"

# Postinstall scripts
grep -rn "postinstall\|preinstall\|prepare" package.json 2>/dev/null

# .npmrc на auth tokens
grep -rn "authToken\|_authToken\|//registry.*:_auth" .npmrc 2>/dev/null

# Git deps в package.json
grep -rn "git+http\|github:\|git@" package.json 2>/dev/null

# SBOM файлы
ls -la sbom.* *.spdx *.spdx.json cyclonedx.* *.cdx.json 2>/dev/null

# Sigstore
ls -la *.sig *.pem cosign.* 2>/dev/null
```

## Классификация

| Находка | Severity |
|---|---|
| CVE с CVSS >= 9.0 в production-зависимости | Critical |
| Компрометированные пакеты из известной 2026-кампании (LiteLLM 1.82.7/8, Axios маrt 2026, и т. д.) | Critical |
| mcp-remote < 0.1.16, mcp-server-git до фикса CVE-2025-68143/4/5 | Critical |
| CVE с CVSS 7.0–8.9 в production-зависимости | High |
| Auth token в `.npmrc` | High |
| Отсутствие SBOM для compliance-критичного продукта (EU CRA scope) | High |
| Git dependency без SHA pinning | High |
| Container image без digest pinning | Medium |
| GitHub Actions с tag-pinning вместо SHA | Medium |
| Отсутствие lockfile | Medium |
| CVE в devDependency (не попадает в production bundle) | Low |
| Устаревшая зависимость без известных CVE | Info |
