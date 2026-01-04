/**
 * API Endpoint для веб-поиска через Google Custom Search
 *
 * Для проекта 333 (юридическое приложение)
 *
 * Endpoints:
 * POST /api/web-search - выполнить поиск
 *
 * Для Vercel/serverless: просто скопировать в /api/web-search.js
 */

import { createGoogleSearch } from './lib/google-search.js';

// Создаём клиент поиска (singleton)
let searchClient = null;

function getSearchClient() {
  if (!searchClient) {
    searchClient = createGoogleSearch({
      apiKey: process.env.GOOGLE_API_KEY,
      cseId: process.env.GOOGLE_CSE_ID,
      language: 'lang_ru',
      // Можно переопределить приоритеты доменов под ваш проект
      // domainPriority: { 'yoursite.ru': 10 },
    });
  }
  return searchClient;
}

/**
 * Handler для Vercel/Next.js API Routes
 */
export default async function handler(req, res) {
  // CORS headers
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
    const { query, limit = 5, optimizeQuery = true } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const search = getSearchClient();

    // Проверяем доступность
    if (!search.isAvailable()) {
      return res.status(503).json({
        error: 'Web search not configured',
        message: 'GOOGLE_API_KEY and GOOGLE_CSE_ID are required',
      });
    }

    // Выполняем поиск
    const results = await search.search(query, {
      limit,
      optimizeQuery,
      rankByDomain: true,
    });

    // Возвращаем результаты
    return res.status(200).json({
      success: true,
      query,
      results: search.formatSources(results),
      context: search.formatForContext(results),
      total: results.length,
    });

  } catch (error) {
    console.error('[WebSearch API] Error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
}

/**
 * Для Express.js (альтернативный экспорт)
 */
export async function expressHandler(req, res) {
  return handler(req, res);
}

/**
 * Для интеграции в существующий chat endpoint
 *
 * Использование в вашем chat.js:
 *
 * import { performWebSearch, shouldAutoWebSearch } from './web-search.js';
 *
 * // В обработчике:
 * const autoSearch = shouldAutoWebSearch(message);
 * if (webSearchEnabled || autoSearch) {
 *   const { results, context } = await performWebSearch(message);
 *   fullContext += context;
 * }
 */
export async function performWebSearch(query, options = {}) {
  const search = getSearchClient();

  if (!search.isAvailable()) {
    console.warn('[WebSearch] Not available - missing API keys');
    return { results: [], context: '', sources: [] };
  }

  const results = await search.search(query, {
    limit: options.limit || 5,
    optimizeQuery: options.optimizeQuery !== false,
    rankByDomain: true,
  });

  return {
    results,
    context: search.formatForContext(results),
    sources: search.formatSources(results),
  };
}

export function shouldAutoWebSearch(query) {
  const search = getSearchClient();
  return search.shouldAutoSearch(query);
}
