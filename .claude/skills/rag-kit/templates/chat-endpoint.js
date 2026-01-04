/**
 * RAG Kit — Chat API Endpoint
 *
 * Скопируй в: api/chat.js
 * Настрой: systemPrompt и grokConfig
 */

import { createRAGService } from './lib/rag-kit/index.js';

// ============================================================
// КОНФИГУРАЦИЯ — НАСТРОЙ ПОД СВОЙ ПРОЕКТ
// ============================================================

const SYSTEM_PROMPT = `Ты — AI-ассистент.

=== ИСТОЧНИКИ ===
Используй документы из базы знаний для ответов.

=== СТИЛЬ ===
- Отвечай чётко и по существу
- Ссылайся на источники
- Структурируй ответ

=== ПРАВИЛА ===
1. Не выдумывай факты
2. Если информации нет — скажи об этом
3. Отвечай на русском`;

// Синонимы для расширения поиска
const SYNONYMS = {
  // 'термин': ['синоним1', 'синоним2'],
};

// Категории документов
const CATEGORIES = {
  // faq: { keywords: ['вопрос', 'как', 'почему'] },
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ RAG SERVICE
// ============================================================

const rag = createRAGService({
  systemPrompt: SYSTEM_PROMPT,

  grokConfig: {
    synonyms: SYNONYMS,
    categories: CATEGORIES,
  },

  // Опционально: веб-поиск
  webSearch: {
    enabled: false,
    cseId: process.env.GOOGLE_CSE_ID,
    triggers: [],
    domainPriority: {},
  },

  // Опции
  maxHistoryLength: 10,
  maxOutputTokens: 8192,
  temperature: 0.7,
  searchLimit: 20,
});

// ============================================================
// API HANDLER
// ============================================================

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      message,
      history = [],
      appContext = '',
      webSearch = false,
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[Chat] Query: "${message.substring(0, 50)}..."`);

    const result = await rag.chat({
      message,
      history,
      appContext,
      enableWebSearch: webSearch,
    });

    console.log(`[Chat] Response: ${result.response.length} chars, ${result.sources.length} sources`);

    res.json({
      response: result.response,
      sources: result.sources,
      webSources: result.webSources,
      autoWebSearchUsed: result.autoWebSearchUsed,
    });

  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({
      error: 'Произошла ошибка при обработке запроса',
      details: error.message,
    });
  }
}
