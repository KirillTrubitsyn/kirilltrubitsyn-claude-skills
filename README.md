# Kirill Trubitsyn Claude Skills

Коллекция профессиональных skills для Claude Code — создание юридических, аналитических документов и RAG-интеграции.

## Skills

| Skill | Описание | Формат |
|-------|----------|--------|
| [analytical-brief](.claude/skills/analytical-brief/) | Аналитические справки для руководства | DOCX |
| [kuznetsov](.claude/skills/kuznetsov/) | Стратегические документы высшего уровня | DOCX |
| [bevzenko](.claude/skills/bevzenko/) | Глубокие юридические заключения | DOCX |
| [legal-docs-ru](.claude/skills/legal-docs-ru/) | Юридические документы общего назначения | DOCX |
| [legal-summary-html](.claude/skills/legal-summary-html/) | Интерактивные резюме арбитражных решений | HTML |
| [analytics-reports](.claude/skills/analytics-reports/) | Аналитические отчёты с графиками | HTML |
| [rag-kit](.claude/skills/rag-kit/) | RAG интеграция с xAI Grok и Google Gemini | JS |

## Когда использовать

### analytical-brief
Аналитические справки в стиле корпоративных юридических документов.
- Информационные записки для руководства
- Обзоры судебных споров
- Корпоративные отчёты

### kuznetsov
Стратегические документы с профессиональным оформлением.
- Документы для совета директоров
- Правовые меморандумы в арбитражные трибуналы
- Инвестиционные предложения
- Финансовые планы и стратегии

### bevzenko
Юридические заключения с академической глубиной анализа.
- Научные правовые заключения
- Экспертные мнения
- Документы с доктринальным обоснованием
- Многоуровневая юридическая аргументация

### legal-docs-ru
Типовые юридические документы на русском языке.
- Справки, заключения, письма
- Формальная переписка
- Документы в суды и трибуналы

### legal-summary-html
Интерактивные HTML-документы с профессиональным дизайном.
- Резюме арбитражных решений
- Обзоры процессуальных приказов
- Интерактивные аналитические записки

### analytics-reports
Аналитические отчёты с визуализацией данных.
- Финансовые отчёты с графиками (Chart.js)
- Экономические обзоры
- Сравнительный анализ
- Две темы: dark-premium и analytics-green

### rag-kit
Библиотека для создания AI-чатов с базой знаний.
- Интеграция с xAI Grok Collections
- Google Gemini для генерации ответов
- Веб-поиск для актуальной информации
- Готовые шаблоны API endpoints

## Установка

### Требования

- Claude Code 1.0+
- Node.js 18+ (для DOCX skills)
- Пакет `docx` для генерации документов

```bash
npm install docx
```

Для rag-kit дополнительно:
```bash
npm install @google/generative-ai
```

### Использование

Skills автоматически активируются при соответствующих запросах:

```
Создай аналитическую справку о судебном споре...
→ активируется analytical-brief

Подготовь правовое заключение по вопросу...
→ активируется bevzenko

Сделай резюме арбитражного решения в HTML...
→ активируется legal-summary-html

Добавь RAG-чат с базой знаний...
→ активируется rag-kit
```

## Структура репозитория

```
.claude/skills/
├── analytical-brief/
│   └── SKILL.md
├── analytics-reports/
│   └── SKILL.md
├── bevzenko/
│   └── SKILL.md
├── kuznetsov/
│   ├── SKILL.md
│   └── template.js
├── legal-docs-ru/
│   └── SKILL.md
├── legal-summary-html/
│   └── SKILL.md
└── rag-kit/
    ├── SKILL.md
    ├── api-reference.md
    ├── examples.md
    └── templates/
        ├── chat-endpoint.js
        ├── config-template.js
        ├── env-example.txt
        └── upload-endpoint.js
```

## Лицензия

MIT
