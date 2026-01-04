# RAG Kit — Примеры использования

## 1. Простой чат-бот

Минимальная настройка для чата с документами.

```javascript
// api/chat.js
import { createRAGService } from './lib/rag-kit/index.js';

const rag = createRAGService({
  systemPrompt: `Ты — AI-ассистент компании.
Отвечай на вопросы, используя документы из базы знаний.
Если информации нет — честно скажи об этом.`,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [] } = req.body;

    const result = await rag.chat({ message, history });

    res.json({
      response: result.response,
      sources: result.sources,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 2. Чат с веб-поиском

Автоматический поиск в интернете для актуальной информации.

```javascript
import { createRAGService } from './lib/rag-kit/index.js';

const rag = createRAGService({
  systemPrompt: `Ты — AI-ассистент.
Используй документы и веб-результаты для ответов.`,

  webSearch: {
    enabled: true,
    cseId: process.env.GOOGLE_CSE_ID,
    triggers: [
      'актуальная информация',
      'последние новости',
      '2025 год',
      'текущая версия',
    ],
    domainPriority: {
      'docs.example.com': 10,
      'stackoverflow.com': 8,
      'github.com': 7,
    },
  },
});

export default async function handler(req, res) {
  const { message, history, webSearch = false } = req.body;

  const result = await rag.chat({
    message,
    history,
    enableWebSearch: webSearch,
  });

  res.json({
    response: result.response,
    sources: result.sources,
    webSources: result.webSources,
    autoWebSearchUsed: result.autoWebSearchUsed,
  });
}
```

---

## 3. Чат для интернет-магазина

Конфигурация для e-commerce с синонимами и категориями.

```javascript
import { createRAGService, createConfig } from './lib/rag-kit/index.js';

const config = createConfig({
  systemPrompt: `Ты — консультант интернет-магазина TechShop.

ТВОИ ЗАДАЧИ:
- Помогать с выбором товаров
- Отвечать на вопросы о доставке и оплате
- Консультировать по гарантии и возврату

СТИЛЬ:
- Дружелюбный и профессиональный
- Краткие и чёткие ответы
- Предлагай альтернативы`,

  synonyms: {
    'доставка': ['отправка', 'shipping', 'курьер', 'почта'],
    'оплата': ['платёж', 'payment', 'карта', 'наличные'],
    'гарантия': ['warranty', 'сервис', 'ремонт'],
    'ноутбук': ['лэптоп', 'laptop', 'macbook'],
    'телефон': ['смартфон', 'iphone', 'android'],
  },

  categories: {
    delivery: {
      keywords: ['доставка', 'курьер', 'почта', 'срок'],
      patterns: ['когда.*прид', 'сколько.*дн'],
    },
    payment: {
      keywords: ['оплата', 'карта', 'наличные', 'рассрочка'],
    },
    warranty: {
      keywords: ['гарантия', 'возврат', 'брак', 'ремонт'],
    },
    products: {
      keywords: ['товар', 'модель', 'характеристики'],
    },
  },

  searchLimit: 15,
  temperature: 0.6,
});

const rag = createRAGService(config);

export default async function handler(req, res) {
  const { message, history } = req.body;
  const result = await rag.chat({ message, history });
  res.json(result);
}
```

---

## 4. Юридический ассистент

Конфигурация для работы с юридическими документами.

```javascript
import { createRAGService } from './lib/rag-kit/index.js';

const rag = createRAGService({
  systemPrompt: `Ты — юридический AI-помощник.

ИСТОЧНИКИ:
1. Документы из базы знаний (приоритет)
2. Веб-источники (для актуальной практики)

СТИЛЬ:
- Развёрнутые подробные ответы
- Ссылки на конкретные документы и статьи
- Структурированные разъяснения

ПРАВИЛА:
1. НЕ выдумывай законы и судебные решения
2. Указывай источники информации
3. При неуверенности — рекомендуй консультацию юриста`,

  grokConfig: {
    synonyms: {
      'кс': ['конституционный суд', 'кс рф'],
      'вс': ['верховный суд', 'вс рф'],
      'ас': ['арбитражный суд'],
      'постановление': ['определение', 'решение', 'судебный акт'],
      'гк': ['гражданский кодекс'],
      'упк': ['уголовно-процессуальный кодекс'],
    },

    queryPatterns: {
      identifiers: [
        { regex: '(?:№|номер|n)\\s*([\\d-]+(?:-п)?)', flags: 'gi', group: 1 },
        { regex: '(\\d+-п)', flags: 'gi', group: 1 },
        { regex: '([аa]\\d+-\\d+(?:\\/\\d+)?)', flags: 'gi', group: 1 },
      ],
      entities: [
        { regex: '(кс\\s*рф|конституционн\\w+\\s+суд)', flags: 'gi', group: 1 },
        { regex: '(вс\\s*рф|верховн\\w+\\s+суд)', flags: 'gi', group: 1 },
      ],
    },

    rerankingRules: [
      {
        field: 'combined',
        match: { type: 'term', termType: 'identifiers' },
        bonus: 0.5,
      },
      {
        field: 'combined',
        match: { type: 'keyword_ratio', threshold: 0.3 },
        penalty: -0.3,
      },
    ],
  },

  webSearch: {
    enabled: true,
    cseId: process.env.GOOGLE_CSE_ID,
    triggers: [
      'последняя практика',
      'свежая практика',
      'актуальная редакция',
      '2024 год',
      '2025 год',
    ],
    domainPriority: {
      'ksrf.ru': 10,
      'vsrf.ru': 10,
      'consultant.ru': 9,
      'garant.ru': 9,
      'pravo.gov.ru': 9,
    },
  },

  maxOutputTokens: 8192,
  temperature: 0.7,
});

export default async function handler(req, res) {
  const { message, history, appContext } = req.body;

  const result = await rag.chat({
    message,
    history,
    appContext,  // Дополнительный контекст дела
  });

  res.json(result);
}
```

---

## 5. Загрузка документов

API для загрузки документов в базу знаний.

```javascript
// api/upload.js
import { createUploadService } from './lib/rag-kit/index.js';

const uploader = createUploadService();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверка авторизации
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { title, content, source, category } = req.body;

    const result = await uploader.upload({
      title,
      content,
      source,
      category,
    });

    res.json({
      success: true,
      documentId: result.documentId,
      message: `Документ "${title}" загружен`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 6. Управление документами

Полный CRUD для документов.

```javascript
// api/documents.js
import { createUploadService } from './lib/rag-kit/index.js';

const uploader = createUploadService();

export default async function handler(req, res) {
  // Проверка авторизации
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Список документов
        const list = await uploader.list();
        res.json(list);
        break;

      case 'POST':
        // Загрузка документа
        const uploaded = await uploader.upload(req.body);
        res.json(uploaded);
        break;

      case 'DELETE':
        // Удаление документа
        const { documentId } = req.body;
        const deleted = await uploader.delete(documentId);
        res.json(deleted);
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 7. Только поиск (без генерации)

Использование Grok клиента напрямую.

```javascript
// api/search.js
import { createGrokClient } from './lib/rag-kit/index.js';

const grok = createGrokClient({
  synonyms: {
    'доставка': ['shipping', 'отправка'],
  },
  enableQueryExpansion: true,
  enableReranking: true,
});

export default async function handler(req, res) {
  const { query, limit = 10 } = req.body;

  try {
    const documents = await grok.search(query, { limit });

    res.json({
      query,
      count: documents.length,
      documents: documents.map(d => ({
        title: d.title,
        snippet: d.content.substring(0, 200) + '...',
        score: d.similarity,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 8. Frontend интеграция

Пример React компонента.

```jsx
// components/Chat.jsx
import { useState } from 'react';

export function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-10),
        }),
      });

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          sources: data.sources,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
            {msg.sources && (
              <div className="sources">
                Источники: {msg.sources.join(', ')}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="loading">Думаю...</div>}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="Введите вопрос..."
        />
        <button onClick={sendMessage} disabled={loading}>
          Отправить
        </button>
      </div>
    </div>
  );
}
```

---

## 9. Vercel конфигурация

```json
// vercel.json
{
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ],
  "functions": {
    "api/chat.js": {
      "maxDuration": 300
    },
    "api/upload.js": {
      "maxDuration": 60
    }
  }
}
```

---

## 10. Переменные окружения

```env
# .env.example

# Google AI (Gemini) — обязательно
GOOGLE_API_KEY=AIza...

# xAI Grok Collections — обязательно
XAI_API_KEY=xai-...
XAI_MANAGEMENT_API_KEY=xai-...
GROK_COLLECTION_ID=collection_...

# Google Custom Search — опционально
GOOGLE_CSE_ID=...

# Администрирование
ADMIN_PASSWORD=...
API_SECRET=...
```
