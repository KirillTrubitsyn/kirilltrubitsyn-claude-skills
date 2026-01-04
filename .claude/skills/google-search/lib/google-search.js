/**
 * Google Custom Search API - модуль веб-поиска
 *
 * Для проекта 333 (юридическое приложение)
 *
 * Использование:
 * import { createGoogleSearch } from './lib/google-search.js';
 * const search = createGoogleSearch({ apiKey, cseId });
 * const results = await search.search('запрос');
 */

/**
 * Конфигурация по умолчанию для юридических доменов
 */
const DEFAULT_LEGAL_DOMAINS = {
  // Высшие суды (максимальный приоритет)
  'ksrf.ru': 10,           // Конституционный суд РФ
  'vsrf.ru': 10,           // Верховный суд РФ

  // Законодательство
  'consultant.ru': 9,
  'www.consultant.ru': 9,
  'garant.ru': 9,
  'www.garant.ru': 9,
  'pravo.gov.ru': 9,       // Официальный портал правовой информации

  // Арбитражные суды
  'kad.arbitr.ru': 8,      // Картотека арбитражных дел
  'arbitr.ru': 8,
  'ras.arbitr.ru': 7,

  // Судебные акты
  'sudact.ru': 7,

  // Юридические порталы
  'zakon.ru': 6,
  'advgazeta.ru': 5,
  'pravo.ru': 4,
};

/**
 * Триггеры для автоматического веб-поиска (юридический контекст)
 */
const DEFAULT_AUTO_TRIGGERS = [
  'последняя практика',
  'свежая практика',
  'актуальная практика',
  'новая практика',
  'текущая практика',
  'последние решения',
  'свежие решения',
  'актуальные изменения',
  'последние изменения',
  '2024 год',
  '2025 год',
  'действующая редакция',
  'актуальная редакция',
  'изменения в законодательстве',
];

/**
 * Создание клиента Google Search
 * @param {Object} config - Конфигурация
 */
export function createGoogleSearch(config = {}) {
  const {
    apiKey = process.env.GOOGLE_API_KEY,
    cseId = process.env.GOOGLE_CSE_ID,
    language = 'lang_ru',
    domainPriority = DEFAULT_LEGAL_DOMAINS,
    autoTriggers = DEFAULT_AUTO_TRIGGERS,
    queryOptimizer = null,
    logger = console,
  } = config;

  /**
   * Проверка доступности поиска
   */
  function isAvailable() {
    return !!(apiKey && cseId);
  }

  /**
   * Проверка, нужен ли автоматический веб-поиск
   * @param {string} query - Запрос пользователя
   * @returns {boolean}
   */
  function shouldAutoSearch(query) {
    const lowerQuery = query.toLowerCase();
    return autoTriggers.some(trigger => lowerQuery.includes(trigger.toLowerCase()));
  }

  /**
   * Оптимизация запроса для юридического поиска
   * @param {string} query - Исходный запрос
   * @returns {string} - Оптимизированный запрос
   */
  function optimizeLegalQuery(query) {
    // Если передан кастомный оптимизатор - используем его
    if (queryOptimizer) {
      return queryOptimizer(query);
    }

    const extracted = [];

    // Номера постановлений/определений
    const docNumberMatch = query.match(/(?:№|номер|N)\s*(\d+[-/]?[ПпОо]?)/i);
    if (docNumberMatch) {
      extracted.push(`№ ${docNumberMatch[1]}`);
    }

    // Конституционный суд
    if (/кс\s*рф|конституционн\w+\s+суд/i.test(query)) {
      extracted.push('Конституционный Суд РФ');
    }

    // Верховный суд
    if (/вс\s*рф|верховн\w+\s+суд/i.test(query)) {
      extracted.push('Верховный Суд РФ');
    }

    // Арбитражные суды
    if (/арбитраж/i.test(query)) {
      extracted.push('арбитражный суд');
    }

    // Экологические споры
    if (/эколог|окруж\w+\s+сред|природ|загрязн/i.test(query)) {
      extracted.push('экологический спор');
    }

    // Возмещение вреда
    if (/вред|ущерб|возмещен/i.test(query)) {
      extracted.push('возмещение вреда');
    }

    // Если нашли конкретные термины — используем их
    if (extracted.length >= 2) {
      return extracted.join(' ') + ' судебная практика';
    }

    // Иначе — извлекаем ключевые слова
    const stopWords = ['расскажи', 'покажи', 'найди', 'какая', 'какие', 'какой', 'где', 'как', 'что', 'когда', 'почему', 'зачем', 'кто'];
    const words = query.split(/\s+/).filter(w =>
      w.length > 3 && !stopWords.includes(w.toLowerCase())
    );

    const keyWords = words.slice(0, 5).join(' ');
    return keyWords + ' судебная практика РФ';
  }

  /**
   * Ранжирование результатов по приоритету доменов
   * @param {Array} results - Результаты поиска
   * @returns {Array} - Отсортированные результаты
   */
  function rankResults(results) {
    return results
      .map(r => ({
        ...r,
        priority: domainPriority[r.source] || 0
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Выполнение веб-поиска
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Опции поиска
   * @returns {Promise<Array>} - Результаты поиска
   */
  async function search(query, options = {}) {
    const {
      limit = 5,
      optimizeQuery = true,
      rankByDomain = true,
    } = options;

    if (!isAvailable()) {
      logger.warn('[GoogleSearch] API ключи не настроены (GOOGLE_API_KEY, GOOGLE_CSE_ID)');
      return [];
    }

    try {
      // Оптимизация запроса
      const searchQuery = optimizeQuery ? optimizeLegalQuery(query) : query;

      logger.log(`[GoogleSearch] Query: "${query.substring(0, 50)}..."`);
      logger.log(`[GoogleSearch] Optimized: "${searchQuery}"`);

      // Формирование URL
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cseId);
      url.searchParams.set('q', searchQuery);
      url.searchParams.set('num', Math.min(limit + 3, 10).toString());
      url.searchParams.set('lr', language);

      // Запрос к API
      const response = await fetch(url.toString());

      if (!response.ok) {
        const error = await response.text();
        logger.error('[GoogleSearch] API error:', response.status, error);
        return [];
      }

      const data = await response.json();
      const items = data.items || [];

      // Преобразование результатов
      let results = items.map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: new URL(item.link).hostname,
      }));

      // Ранжирование по доменам
      if (rankByDomain) {
        results = rankResults(results);
      }

      // Ограничение количества
      results = results.slice(0, limit);

      logger.log(`[GoogleSearch] Found ${items.length} results, returning ${results.length}`);
      results.forEach((r, i) => {
        logger.log(`  [${i + 1}] ${r.source} (priority: ${r.priority || 0}): ${r.title.substring(0, 40)}...`);
      });

      return results;

    } catch (error) {
      logger.error('[GoogleSearch] Error:', error.message);
      return [];
    }
  }

  /**
   * Форматирование результатов для контекста LLM
   * @param {Array} results - Результаты поиска
   * @returns {string} - Отформатированный текст
   */
  function formatForContext(results) {
    if (!results || results.length === 0) {
      return '';
    }

    const formatted = results.map((r, i) =>
      `[Веб-источник ${i + 1}]: ${r.title}\nURL: ${r.url}\nСодержание: ${r.snippet}`
    ).join('\n\n');

    return `\n\n=== РЕЗУЛЬТАТЫ ПОИСКА В ИНТЕРНЕТЕ (${results.length}) ===\n\n${formatted}\n\n=== КОНЕЦ ВЕБ-РЕЗУЛЬТАТОВ ===`;
  }

  /**
   * Форматирование для ответа API
   * @param {Array} results - Результаты поиска
   * @returns {Array} - Отформатированные источники
   */
  function formatSources(results) {
    return results.map(r => ({
      title: r.title,
      url: r.url,
      source: r.source,
    }));
  }

  // Публичный API
  return {
    search,
    isAvailable,
    shouldAutoSearch,
    optimizeLegalQuery,
    rankResults,
    formatForContext,
    formatSources,

    // Конфигурация
    config: {
      hasApiKey: !!apiKey,
      hasCseId: !!cseId,
      language,
      triggersCount: autoTriggers.length,
    },
  };
}

// Экспорт констант для кастомизации
export {
  DEFAULT_LEGAL_DOMAINS,
  DEFAULT_AUTO_TRIGGERS,
};

export default { createGoogleSearch, DEFAULT_LEGAL_DOMAINS, DEFAULT_AUTO_TRIGGERS };
