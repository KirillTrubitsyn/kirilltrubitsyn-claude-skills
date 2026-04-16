# Зависимости и Supply Chain

## Что проверять

### 1. Известные уязвимости (CVE)
Выполни аудит зависимостей:

```bash
# Node.js
npm audit 2>/dev/null || yarn audit 2>/dev/null || pnpm audit 2>/dev/null

# Python
pip audit 2>/dev/null || safety check 2>/dev/null

# Ruby
bundle audit check --update 2>/dev/null

# Go
govulncheck ./... 2>/dev/null
```

Если инструмент аудита недоступен, проверь lockfile вручную: найди пакеты с устаревшими версиями и сверь с базами CVE (NVD, GitHub Advisory Database).

### 2. Устаревшие зависимости
Критически устаревшие зависимости (более 2 major-версий назад) часто содержат незакрытые уязвимости. Проверь:
```bash
npm outdated 2>/dev/null
pip list --outdated 2>/dev/null
bundle outdated 2>/dev/null
```

### 3. Supply chain риски
- **Typosquatting**: проверь, нет ли подозрительных пакетов с именами, похожими на популярные (lodahs вместо lodash, expres вместо express).
- **Lockfile integrity**: есть ли `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` в репозитории? Без lockfile версии зависимостей недетерминированы.
- **Postinstall scripts**: ищи пакеты с `postinstall` / `preinstall` скриптами в `node_modules/.package-lock.json` — это вектор для malicious packages.

### 4. Unused dependencies
Зависимости, которые установлены, но не используются в коде, расширяют поверхность атаки без пользы. Инструменты: `depcheck` (Node.js), `vulture` (Python).

### 5. Внутренние зависимости
- Если проект использует private npm registry или GitHub Packages: проверь `.npmrc` — нет ли auth tokens в файле?
- Dependency confusion: если имя внутреннего пакета не зарезервировано в публичном реестре, атакующий может опубликовать вредоносный пакет с тем же именем.

## Классификация

| Находка | Severity |
|---|---|
| CVE с CVSS >= 9.0 (Critical) в production-зависимости | Critical |
| CVE с CVSS 7.0-8.9 (High) в production-зависимости | High |
| Auth token в `.npmrc` | High |
| Отсутствие lockfile | Medium |
| CVE в devDependency (не попадает в production bundle) | Low |
| Устаревшая зависимость без известных CVE | Info |
