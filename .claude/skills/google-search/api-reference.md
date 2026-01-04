# Google Search — API Reference

## createGoogleSearch(config)

Создаёт клиент для веб-поиска через Google Custom Search API.

### Параметры конфигурации

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `apiKey` | string | `process.env.GOOGLE_API_KEY` | Google API Key |
| `cseId` | string | `process.env.GOOGLE_CSE_ID` | Custom Search Engine ID |
| `language` | string | `'lang_ru'` | Язык поиска |
| `domainPriority` | object | `DEFAULT_LEGAL_DOMAINS` | Приоритеты доменов |
| `autoTriggers` | array | `DEFAULT_AUTO_TRIGGERS` | Триггеры авто-поиска |
| `queryOptimizer` | function | `null` | Кастомный оптимизатор |
| `logger` | object | `console` | Логгер |

### Возвращаемый объект

```javascript
{
  // Выполнить поиск
  search(query, options?): Promise<SearchResult[]>,

  // Проверить доступность API
  isAvailable(): boolean,

  // Проверить триггеры авто-поиска
  shouldAutoSearch(query): boolean,

  // Оптимизировать запрос
  optimizeLegalQuery(query): string,

  // Ранжировать результаты
  rankResults(results): SearchResult[],

  // Форматировать для контекста AI
  formatForContext(results): string,

  // Форматировать источники для ответа
  formatSources(results): Source[],

  // Конфигурация
  config: ConfigInfo,
}
```

---

## search(query, options?)

Выполняет веб-поиск.

### Параметры options

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `limit` | number | `5` | Количество результатов |
| `optimizeQuery` | boolean | `true` | Оптимизировать запрос |
| `rankByDomain` | boolean | `true` | Ранжировать по доменам |

### Возвращает

```javascript
[
  {
    title: string,      // Заголовок страницы
    url: string,        // URL страницы
    snippet: string,    // Описание/сниппет
    source: string,     // Домен (hostname)
    priority: number,   // Приоритет домена (если rankByDomain)
  }
]
```

### Пример

```javascript
const results = await search.search('React hooks tutorial', {
  limit: 5,
  optimizeQuery: true,
  rankByDomain: true,
});
```

---

## isAvailable()

Проверяет, настроены ли API ключи.

### Возвращает

`boolean` — `true` если `apiKey` и `cseId` заданы.

### Пример

```javascript
if (search.isAvailable()) {
  const results = await search.search(query);
} else {
  console.warn('Web search not configured');
}
```

---

## shouldAutoSearch(query)

Проверяет, содержит ли запрос триггеры для автоматического поиска.

### Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `query` | string | Запрос пользователя |

### Возвращает

`boolean` — `true` если запрос содержит триггер.

### Пример

```javascript
const query = 'Какие последние новости по React 19?';

if (search.shouldAutoSearch(query)) {
  // Автоматически включаем веб-поиск
  const results = await search.search(query);
}
```

---

## formatForContext(results)

Форматирует результаты для добавления в контекст AI модели.

### Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `results` | array | Результаты поиска |

### Возвращает

`string` — Отформатированный текст для промпта.

### Пример

```javascript
const results = await search.search(query);
const webContext = search.formatForContext(results);

const fullPrompt = `
${systemPrompt}

${docsContext}

${webContext}

Вопрос: ${userMessage}
`;
```

### Формат вывода

```
=== РЕЗУЛЬТАТЫ ПОИСКА В ИНТЕРНЕТЕ (3) ===

[Веб-источник 1]: Заголовок страницы
URL: https://example.com/page
Содержание: Краткое описание страницы...

[Веб-источник 2]: Другая страница
URL: https://example2.com/page
Содержание: Ещё описание...

=== КОНЕЦ ВЕБ-РЕЗУЛЬТАТОВ ===
```

---

## formatSources(results)

Форматирует результаты для ответа клиенту.

### Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `results` | array | Результаты поиска |

### Возвращает

```javascript
[
  {
    title: string,   // Заголовок
    url: string,     // URL
    source: string,  // Домен
  }
]
```

---

## Константы

### DEFAULT_LEGAL_DOMAINS

Приоритеты юридических доменов по умолчанию:

```javascript
{
  'ksrf.ru': 10,           // Конституционный суд
  'vsrf.ru': 10,           // Верховный суд
  'consultant.ru': 9,
  'garant.ru': 9,
  'pravo.gov.ru': 9,
  'kad.arbitr.ru': 8,
  'arbitr.ru': 8,
  'sudact.ru': 7,
  'zakon.ru': 6,
}
```

### DEFAULT_AUTO_TRIGGERS

Триггеры для автоматического поиска:

```javascript
[
  'последняя практика',
  'свежая практика',
  'актуальная практика',
  'последние решения',
  '2024 год',
  '2025 год',
  'действующая редакция',
  'актуальная редакция',
  'изменения в законодательстве',
]
```

---

## Типы данных

### SearchResult

```typescript
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  priority?: number;
}
```

### Source

```typescript
interface Source {
  title: string;
  url: string;
  source: string;
}
```

### ConfigInfo

```typescript
interface ConfigInfo {
  hasApiKey: boolean;
  hasCseId: boolean;
  language: string;
  triggersCount: number;
}
```

### DomainPriority

```typescript
interface DomainPriority {
  [domain: string]: number;  // 0-10, где 10 — высший приоритет
}
```
