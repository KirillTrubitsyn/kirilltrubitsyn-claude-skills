# CI/CD Pipeline Security

Применяй этот модуль при наличии `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`, `cloudbuild.yaml` или аналогов.

## Что проверять

### 1. Injection через PR metadata
GitHub Actions уязвимы к injection, если workflow использует выражения `${{ github.event.pull_request.title }}`, `${{ github.event.issue.body }}`, `${{ github.event.comment.body }}` внутри `run:` блоков. Атакующий может создать PR с заголовком, содержащим shell-команды.

Безопасный паттерн: передавать значения через environment variables, а не inline:
```yaml
# Уязвимо
- run: echo "${{ github.event.pull_request.title }}"

# Безопасно
- run: echo "$PR_TITLE"
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
```

### 2. Secrets exposure
- Используются ли GitHub Secrets / GitLab CI Variables для секретов, или они захардкожены в workflow-файлах?
- Есть ли `echo` или логирование, которое может вывести секреты в лог?
- Проверь `actions/checkout` с `persist-credentials: true` (по умолчанию) — GITHUB_TOKEN доступен дочерним шагам.

### 3. Разрешения (permissions)
- Указаны ли `permissions` в workflow? Без явного указания используется default (обычно `write-all`), что избыточно.
- Используется ли принцип least privilege: `contents: read`, `pull-requests: write` и т.п.?

### 4. Third-party Actions
- Используются ли actions с пиннингом к SHA (`uses: actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29`) или к тегу (`uses: actions/checkout@v4`)? Теги мутабельны — автор может изменить, на что указывает тег.
- Есть ли actions из непроверенных источников (не `actions/*`, не `github/*`)?

### 5. Branch Protection
- Настроены ли branch protection rules для main/master?
- Требуется ли PR review перед merge?
- Есть ли required status checks (тесты, линтер)?
- Запрещён ли force push в main?

### 6. Deployment Security
- Автоматический деплой в production при push в main: есть ли approval step?
- Разделены ли окружения staging и production?
- Используются ли отдельные credentials для staging и production?

## Как искать

```
# Workflow files
find . -name "*.yml" -path "*/.github/workflows/*" -o -name ".gitlab-ci.yml" -o -name "Jenkinsfile" -o -name "bitbucket-pipelines.yml"

# Injection-уязвимые паттерны
grep -rn "github\.event\.\|gitlab\.ci\.\|env\.CI_" --include="*.{yml,yaml}"

# Inline secrets
grep -rn "password:\|token:\|secret:\|api_key:" .github/workflows/ .gitlab-ci.yml 2>/dev/null

# Permissions
grep -rn "permissions:" .github/workflows/ 2>/dev/null
```
