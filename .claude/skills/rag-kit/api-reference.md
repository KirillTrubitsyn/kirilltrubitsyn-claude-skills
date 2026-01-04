# RAG Kit — API Reference

## createRAGService(config)

Создаёт RAG сервис для чата с контекстом из документов.

### Параметры конфигурации

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `googleApiKey` | string | `process.env.GOOGLE_API_KEY` | API ключ Google |
| `chatModel` | string | `'gemini-3-pro-preview'` | Модель Gemini |
| `systemPrompt` | string | Базовый промпт | Инструкции для AI |
| `grokConfig` | object | `{}` | Конфигурация Grok клиента |
| `webSearch` | object | `{ enabled: false }` | Настройки веб-поиска |
| `maxHistoryLength` | number | `10` | Макс. сообщений в истории |
| `maxOutputTokens` | number | `8192` | Макс. токенов ответа |
| `temperature` | number | `0.7` | Температура генерации |
| `searchLimit` | number | `20` | Лимит документов при поиске |
| `logger` | object | `console` | Логгер |

### Возвращаемый объект

```javascript
{
  // Основная функция чата
  chat(options): Promise<ChatResult>,

  // Поиск документов
  search(query, limit?): Promise<Document[]>,

  // Веб-поиск
  searchWeb(query, limit?): Promise<WebResult[]>,

  // Доступ к Grok клиенту
  grokClient: GrokClient,

  // Текущая конфигурация
  config: { chatModel, webSearchEnabled }
}
```

### chat(options)

Основная функция чата.

**Параметры:**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `message` | string | Да | Сообщение пользователя |
| `history` | array | Нет | История сообщений |
| `appContext` | string | Нет | Дополнительный контекст |
| `enableWebSearch` | boolean | Нет | Включить веб-поиск |

**Возвращает:**

```javascript
{
  response: string,           // Ответ AI
  sources: string[],          // Названия документов
  webSources: WebSource[],    // Веб-источники
  autoWebSearchUsed: boolean, // Был ли авто веб-поиск
}
```

---

## createGrokClient(config)

Создаёт клиент для работы с xAI Grok Collections.

### Параметры конфигурации

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `apiKey` | string | `process.env.XAI_API_KEY` | API ключ для поиска |
| `managementApiKey` | string | `process.env.XAI_MANAGEMENT_API_KEY` | API ключ для управления |
| `collectionId` | string | `process.env.GROK_COLLECTION_ID` | ID коллекции |
| `synonyms` | object | `{}` | Словарь синонимов |
| `categories` | object | `{}` | Категории документов |
| `queryPatterns` | object | `{}` | Паттерны извлечения |
| `rerankingRules` | array | `[]` | Правила переранжирования |
| `defaultRetrievalMode` | string | `'hybrid'` | Режим поиска |
| `defaultLimit` | number | `20` | Лимит результатов |
| `enableQueryExpansion` | boolean | `true` | Расширение запроса |
| `enableReranking` | boolean | `true` | Переранжирование |
| `enableAutoClassify` | boolean | `true` | Автоклассификация |

### Возвращаемый объект

```javascript
{
  // Поиск документов
  search(query, options?): Promise<Document[]>,

  // Загрузка документа
  upload(document, options?): Promise<UploadResult>,

  // Список документов
  list(options?): Promise<Document[]>,

  // Удаление документа
  delete(documentId): Promise<boolean>,

  // Утилиты
  utils: {
    extractKeyTerms(query): KeyTerms,
    expandQuery(query): string,
    classifyQuery(query): string[] | null,
  },

  // Конфигурация
  config: {
    collectionId: string,
    hasApiKey: boolean,
    hasManagementKey: boolean,
  }
}
```

### search(query, options?)

Поиск документов в коллекции.

**Параметры options:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `retrievalMode` | string | `'hybrid'` | `hybrid`, `semantic`, `keyword` |
| `limit` | number | `20` | Макс. результатов |
| `useExpansion` | boolean | `true` | Расширять запрос |
| `useReranking` | boolean | `true` | Переранжировать |

**Возвращает:**

```javascript
[
  {
    id: string,
    title: string,
    content: string,
    source: string,
    category: string,
    similarity: number,
    adjustedScore?: number,  // После reranking
    bonus?: number,          // Бонус reranking
  }
]
```

### upload(document, options?)

Загрузка документа в коллекцию.

**Параметры document:**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `title` | string | Да | Название документа |
| `content` | string | Да | Содержимое |
| `source` | string | Нет | Источник |
| `category` | string | Нет | Категория |
| `metadata` | object | Нет | Дополнительные метаданные |

### list(options?)

Получение списка документов.

**Параметры options:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `fetchAll` | boolean | `true` | Загрузить все страницы |

### delete(documentId)

Удаление документа по ID.

---

## createUploadService(config)

Упрощённый сервис для загрузки документов.

### Параметры конфигурации

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `grokConfig` | object | `{}` | Конфигурация Grok |
| `logger` | object | `console` | Логгер |

### Возвращаемый объект

```javascript
{
  upload(document): Promise<UploadResult>,
  delete(documentId): Promise<DeleteResult>,
  list(): Promise<ListResult>,
  grokClient: GrokClient,
}
```

---

## createConfig(customConfig)

Создаёт конфигурацию на основе шаблона.

### Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `systemPrompt` | string | System prompt для AI |
| `synonyms` | object | Дополнительные синонимы |
| `categories` | object | Дополнительные категории |
| `queryPatterns` | object | Дополнительные паттерны |
| `rerankingRules` | array | Правила переранжирования |
| `webSearchEnabled` | boolean | Включить веб-поиск |
| `webSearchTriggers` | array | Триггеры авто веб-поиска |
| `domainPriority` | object | Приоритеты доменов |
| `chatModel` | string | Модель Gemini |
| `searchLimit` | number | Лимит поиска |
| `temperature` | number | Температура |

### Возвращает

Полный объект конфигурации для `createRAGService`.

---

## Типы данных

### Document

```typescript
interface Document {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  similarity: number;
}
```

### ChatMessage

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

### WebSource

```typescript
interface WebSource {
  title: string;
  url: string;
  source: string;  // hostname
}
```

### SynonymsConfig

```typescript
interface SynonymsConfig {
  [term: string]: string[];  // термин -> синонимы
}
```

### CategoriesConfig

```typescript
interface CategoriesConfig {
  [category: string]: {
    keywords?: string[];
    patterns?: string[];  // regex
  };
}
```

### QueryPatternsConfig

```typescript
interface QueryPatternsConfig {
  identifiers?: PatternRule[];
  entities?: PatternRule[];
  [customType: string]: PatternRule[];
}

interface PatternRule {
  regex: string;
  flags?: string;
  group?: number;
}
```

### RerankingRule

```typescript
interface RerankingRule {
  field: 'title' | 'content' | 'combined';
  match: {
    type: 'term' | 'regex' | 'keyword_ratio';
    termType?: string;
    pattern?: string;
    threshold?: number;
  };
  bonus?: number;
  penalty?: number;
}
```
