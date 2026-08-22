# Формат отчёта

Использовать для формального Markdown-отчёта или структурированного JSON. По умолчанию не создавать файл без запроса пользователя.

## Краткий отчёт

1. Итог в 3–6 предложениях.
2. Scope, режим, дата и ограничения.
3. Таблица findings.
4. Подробности Critical/High, затем остальные подтверждённые findings.
5. Coverage matrix.
6. Подтверждённые сильные controls.
7. План исправления: now / next / later.
8. Метод повторной проверки.

Не добавлять декоративную статистику, общий «security score» или утверждение о полноте, если coverage ограничено.

## Поля finding

| Поле | Содержание |
|---|---|
| `id` | Стабильный fingerprint, не порядковый номер отчёта |
| `title` | Конкретная слабость и затронутая граница |
| `status` | `Verified`, `Likely` или `Hypothesis` |
| `severity` | `Critical`, `High`, `Medium`, `Low`, `Informational` |
| `confidence` | `High`, `Medium` или `Low` |
| `asset` | Затронутый компонент/данные/операция |
| `locations` | Точные файлы, строки, endpoints или config keys |
| `evidence` | Минимальное редактированное доказательство |
| `preconditions` | Доступ, роль, состояние и иные условия |
| `impact` | Реалистичное локальное воздействие |
| `counter_evidence` | Проверенные защиты и ограничения |
| `remediation` | Контроль, устраняющий первопричину |
| `validation` | Безопасный regression/retest |
| `references` | Версионированный стандарт/advisory; поле необязательное |

Обязательны все поля, кроме `references`: он добавляется, когда находка опирается на внешний стандарт или advisory, и опускается, когда она доказана только кодом проекта. Ровно этот набор проверяет `scripts/validate_findings.py`.

### Fingerprint

Строить стабильный ID из `rule/control + asset + enforcement point/sink`. Не включать severity, номер строки или дату: они меняются при исправлении.

### Evidence

Хорошее доказательство показывает путь от недоверенного источника или полномочия до воздействия. Фрагмент кода без вызывающего пути и контекста недостаточен.

Не помещать в evidence:

- действующие секреты;
- полные персональные данные;
- destructive payload;
- большие дампы;
- чужие данные, полученные после уже доказанного обхода.

### Counter-evidence

Явно перечислить просмотренные middleware, policies, database constraints, tests, network boundaries и runtime controls. Если counter-evidence снижает риск, объяснить как именно.

## Coverage matrix

Для каждого применимого домена:

| Domain | Status | Reviewed evidence | Gaps / reason |
|---|---|---|---|
| Authorization | Reviewed | routes, middleware, policies | — |
| Supply chain | Partial | manifests, lockfiles | live advisory lookup not authorized |
| Active runtime | Not tested | — | no target authorization |

Разрешённые статусы: `Reviewed`, `Partial`, `Not tested`, `Not applicable`.

Количество findings сравнивать между аудитами только при сопоставимом scope и coverage.

## JSON

Структура:

```json
{
  "audit": {
    "date": "YYYY-MM-DD",
    "mode": "audit",
    "scope": ["..."],
    "limitations": ["..."]
  },
  "findings": [
    {
      "id": "SA-AUTHZ-OBJECT-OWNER",
      "title": "...",
      "status": "Verified",
      "severity": "High",
      "confidence": "High",
      "asset": "...",
      "locations": ["path:line"],
      "evidence": ["..."],
      "preconditions": ["..."],
      "impact": "...",
      "counter_evidence": ["..."],
      "remediation": "...",
      "validation": "..."
    }
  ],
  "coverage": [
    {
      "domain": "Authorization",
      "status": "Reviewed",
      "evidence": ["routes", "middleware", "policies"],
      "gaps": ""
    }
  ]
}
```

`coverage` необязателен, но если он есть, каждый элемент содержит `domain` и `status` из набора `Reviewed`, `Partial`, `Not tested`, `Not applicable`. Для `Partial` и `Not tested` заполнять `gaps`: статус без причины не даёт читателю понять, чего в аудите нет.

Перед передачей JSON запустить из каталога скилла:

`python3 scripts/validate_findings.py findings.json`

Скрипт проверяет структуру и отклоняет вероятное неотредактированное secret material, не печатая совпавшее значение. Он проверяет форму, а не качество: успешная валидация не означает, что находка доказана.

## Delta

Дельта строится только тогда, когда пользователь явно просит повторную проверку и даёт прежний отчёт. По умолчанию прогон самодостаточен и сравнений между запусками не содержит.

При повторном аудите для каждого fingerprint использовать:

- `New`;
- `Unchanged`;
- `Improved`;
- `Regressed`;
- `Resolved`;
- `Not retested`.

Изменение номера строки не создаёт новую находку. `Resolved` требует повторной проверки соответствующего пути, а не только наличия патча.
