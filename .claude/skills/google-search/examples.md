# Google Search — Примеры использования

## 1. Базовая интеграция в chat endpoint

```javascript
// api/chat.js
import { createGoogleSearch } from './lib/google-search.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const webSearch = createGoogleSearch();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  const { message, history = [], webSearchEnabled = false } = req.body;

  // Проверяем триггеры автоматического поиска
  const autoSearch = webSearch.shouldAutoSearch(message);
  const shouldSearch = webSearchEnabled || autoSearch;

  // Веб-поиск
  let webContext = '';
  let webSources = [];

  if (shouldSearch && webSearch.isAvailable()) {
    const results = await webSearch.search(message, { limit: 5 });
    webContext = webSearch.formatForContext(results);
    webSources = webSearch.formatSources(results);
  }

  // Вызов Gemini
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
Ты — AI-ассистент.
${webContext}

Вопрос: ${message}
`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  res.json({
    response,
    webSources,
    autoWebSearchUsed: autoSearch && !webSearchEnabled,
  });
}
```

---

## 2. Отдельный API endpoint для поиска

```javascript
// api/web-search.js
import { createGoogleSearch } from './lib/google-search.js';

const search = createGoogleSearch();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, limit = 5 } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  if (!search.isAvailable()) {
    return res.status(503).json({
      error: 'Web search not configured',
    });
  }

  const results = await search.search(query, { limit });

  res.json({
    query,
    results: search.formatSources(results),
    context: search.formatForContext(results),
  });
}
```

---

## 3. E-commerce: поиск товаров и отзывов

```javascript
import { createGoogleSearch } from './lib/google-search.js';

const search = createGoogleSearch({
  language: 'lang_ru',

  // Приоритет e-commerce сайтов
  domainPriority: {
    'ozon.ru': 10,
    'wildberries.ru': 10,
    'market.yandex.ru': 9,
    'dns-shop.ru': 8,
    'mvideo.ru': 8,
    'citilink.ru': 7,
    'irecommend.ru': 6,    // Отзывы
    'otzovik.com': 6,
  },

  // Триггеры для авто-поиска
  autoTriggers: [
    'где купить',
    'цена',
    'отзывы',
    'сравнить',
    'лучший',
    'рейтинг',
    'скидки',
    'акции',
  ],

  // Оптимизация запросов
  queryOptimizer: (query) => {
    // Добавляем "купить" для товарных запросов
    if (!/купить|цена|отзыв/i.test(query)) {
      return query + ' купить цена';
    }
    return query;
  },
});

// Использование
const results = await search.search('iPhone 15 Pro Max');
```

---

## 4. Техническая документация

```javascript
import { createGoogleSearch } from './lib/google-search.js';

const techSearch = createGoogleSearch({
  language: 'lang_en',

  domainPriority: {
    // Официальная документация
    'docs.github.com': 10,
    'developer.mozilla.org': 10,
    'react.dev': 10,
    'nodejs.org': 10,
    'docs.python.org': 10,

    // Сообщество
    'stackoverflow.com': 9,
    'github.com': 8,

    // Туториалы
    'dev.to': 7,
    'medium.com': 6,
    'freecodecamp.org': 7,
  },

  autoTriggers: [
    'how to',
    'tutorial',
    'example',
    'documentation',
    'api reference',
    'best practice',
    'latest version',
  ],

  queryOptimizer: (query) => {
    // Добавляем год для актуальности
    const year = new Date().getFullYear();
    return `${query} ${year}`;
  },
});

// Поиск документации
const results = await techSearch.search('React useEffect cleanup');
```

---

## 5. Новостной поиск

```javascript
import { createGoogleSearch } from './lib/google-search.js';

const newsSearch = createGoogleSearch({
  domainPriority: {
    // Федеральные СМИ
    'rbc.ru': 10,
    'tass.ru': 10,
    'ria.ru': 10,
    'kommersant.ru': 9,
    'vedomosti.ru': 9,
    'forbes.ru': 8,

    // IT новости
    'habr.com': 8,
    'vc.ru': 7,
  },

  autoTriggers: [
    'новости',
    'сегодня',
    'вчера',
    'последние',
    'что случилось',
    'что произошло',
  ],

  queryOptimizer: (query) => {
    // Добавляем "новости" если не указано
    if (!/новост|news/i.test(query)) {
      return query + ' новости';
    }
    return query;
  },
});
```

---

## 6. Интеграция с OpenAI

```javascript
import { createGoogleSearch } from './lib/google-search.js';
import OpenAI from 'openai';

const search = createGoogleSearch();
const openai = new OpenAI();

export default async function handler(req, res) {
  const { message, webSearchEnabled } = req.body;

  let webContext = '';

  if (webSearchEnabled || search.shouldAutoSearch(message)) {
    const results = await search.search(message);
    webContext = search.formatForContext(results);
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Ты — полезный ассистент. ${webContext}`,
      },
      { role: 'user', content: message },
    ],
  });

  res.json({
    response: completion.choices[0].message.content,
  });
}
```

---

## 7. Frontend: Toggle и отображение источников

```html
<!-- HTML -->
<div class="chat-input">
  <label class="web-search-toggle">
    <input type="checkbox" id="webSearchToggle">
    <span>🌐 Поиск в сети</span>
  </label>
  <input type="text" id="messageInput" placeholder="Введите сообщение...">
  <button onclick="sendMessage()">Отправить</button>
</div>

<div id="chatMessages"></div>

<script type="module">
import { initWebSearchUI, renderWebSources } from './js/web-search-ui.js';

initWebSearchUI();

window.sendMessage = async function() {
  const input = document.getElementById('messageInput');
  const toggle = document.getElementById('webSearchToggle');
  const messages = document.getElementById('chatMessages');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: input.value,
      webSearchEnabled: toggle.checked,
    }),
  });

  const data = await response.json();

  messages.innerHTML += `
    <div class="message">
      ${data.response}
      ${renderWebSources(data.webSources, data.autoWebSearchUsed)}
    </div>
  `;

  input.value = '';
}
</script>
```

---

## 8. Кэширование результатов

```javascript
import { createGoogleSearch } from './lib/google-search.js';

const search = createGoogleSearch();

// Простой кэш в памяти
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 15; // 15 минут

async function cachedSearch(query, options = {}) {
  const cacheKey = JSON.stringify({ query, options });

  // Проверяем кэш
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Cache] Hit:', query);
    return cached.results;
  }

  // Выполняем поиск
  const results = await search.search(query, options);

  // Сохраняем в кэш
  cache.set(cacheKey, {
    results,
    timestamp: Date.now(),
  });

  console.log('[Cache] Miss:', query);
  return results;
}

// Использование
const results = await cachedSearch('React 19 features');
```

---

## 9. Rate limiting

```javascript
import { createGoogleSearch } from './lib/google-search.js';

const search = createGoogleSearch();

// Счётчик запросов
let requestCount = 0;
const DAILY_LIMIT = 100;
let lastReset = Date.now();

async function rateLimitedSearch(query, options = {}) {
  // Сброс счётчика каждые 24 часа
  if (Date.now() - lastReset > 24 * 60 * 60 * 1000) {
    requestCount = 0;
    lastReset = Date.now();
  }

  // Проверка лимита
  if (requestCount >= DAILY_LIMIT) {
    throw new Error('Daily search limit exceeded');
  }

  requestCount++;
  return search.search(query, options);
}

// API endpoint
export default async function handler(req, res) {
  try {
    const results = await rateLimitedSearch(req.body.query);
    res.json({ results });
  } catch (error) {
    if (error.message.includes('limit')) {
      res.status(429).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Search failed' });
    }
  }
}
```

---

## 10. Переменные окружения

```env
# .env

# Google API Key
# Получить: https://console.cloud.google.com/
GOOGLE_API_KEY=AIzaSy...

# Google Custom Search Engine ID
# Создать: https://programmablesearchengine.google.com/
GOOGLE_CSE_ID=...
```
