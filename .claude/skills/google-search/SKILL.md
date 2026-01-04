---
name: google-search
description: Интеграция Google Custom Search API в AI-чат. Используй этот skill когда нужно добавить веб-поиск в чат-бота, настроить поиск актуальной информации в интернете, или интегрировать Google Search в приложение.
---

# Google Search Integration — Веб-поиск для AI-чата

Модуль для добавления веб-поиска через Google Custom Search API в любое приложение с AI-чатом.

## Возможности

- Поиск в интернете через Google Custom Search API
- Автоматический поиск по триггерам ("последние новости", "актуальная информация")
- Ранжирование результатов по приоритету доменов
- Оптимизация запросов для предметной области
- Готовые UI компоненты (toggle, отображение источников)

## Быстрый старт

### 1. Получи API ключи

#### Google API Key
1. Перейди в [Google Cloud Console](https://console.cloud.google.com/)
2. Создай проект → APIs & Services → Library
3. Включи **Custom Search API**
4. Credentials → Create Credentials → API Key

#### Google Custom Search Engine ID
1. Перейди на [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Нажми **Add** → настрой поиск по всему интернету или конкретным сайтам
3. Скопируй **Search engine ID** — это `GOOGLE_CSE_ID`

### 2. Настрой переменные окружения

```env
GOOGLE_API_KEY=AIzaSy...
GOOGLE_CSE_ID=ваш-cse-id
```

### 3. Скопируй модуль в проект

```bash
# Скопировать в api/lib/
cp lib/google-search.js YOUR_PROJECT/api/lib/
```

### 4. Интегрируй в chat endpoint

```javascript
import { createGoogleSearch } from './lib/google-search.js';

const webSearch = createGoogleSearch();

export default async function handler(req, res) {
  const { message, webSearchEnabled } = req.body;

  // Автоматический поиск по триггерам
  const autoSearch = webSearch.shouldAutoSearch(message);

  let webContext = '';
  let webSources = [];

  if (webSearchEnabled || autoSearch) {
    const results = await webSearch.search(message, { limit: 5 });
    webContext = webSearch.formatForContext(results);
    webSources = webSearch.formatSources(results);
  }

  // Добавь webContext к промпту для AI
  const fullContext = docsContext + webContext;

  // ... вызов AI модели

  res.json({
    response,
    webSources,
    autoWebSearchUsed: autoSearch,
  });
}
```

## Конфигурация

```javascript
createGoogleSearch({
  // API ключи (по умолчанию из env)
  apiKey: process.env.GOOGLE_API_KEY,
  cseId: process.env.GOOGLE_CSE_ID,

  // Язык поиска
  language: 'lang_ru',

  // Приоритет доменов для ранжирования
  domainPriority: {
    'docs.example.com': 10,
    'stackoverflow.com': 8,
    'github.com': 7,
  },

  // Триггеры для автоматического поиска
  autoTriggers: [
    'последние новости',
    'актуальная информация',
    '2025 год',
  ],

  // Кастомный оптимизатор запросов
  queryOptimizer: (query) => query + ' site:example.com',
});
```

## API Reference

Смотри [api-reference.md](./api-reference.md) для полного описания API.

## Примеры

Смотри [examples.md](./examples.md) для примеров использования.

## Шаблоны

В директории `templates/` находятся готовые файлы:

- `google-search.js` — Основной модуль поиска
- `web-search-endpoint.js` — API endpoint
- `web-search-ui.js` — UI компоненты (toggle, стили)
- `env-example.txt` — Пример .env файла

## Лимиты и стоимость

| Тип | Лимит | Стоимость |
|-----|-------|-----------|
| Бесплатный | 100 запросов/день | $0 |
| Платный | до 10,000/день | $5 за 1,000 запросов |
