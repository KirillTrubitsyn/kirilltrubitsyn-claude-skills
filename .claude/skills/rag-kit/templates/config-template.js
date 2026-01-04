/**
 * RAG Kit — Шаблон конфигурации
 *
 * Скопируй в: api/lib/rag-kit/configs/my-project.js
 * Настрой под свою предметную область
 */

// ============================================================
// 1. СЛОВАРЬ СИНОНИМОВ
// Термины вашей области и их синонимы для расширения поиска
// ============================================================
export const SYNONYMS = {
  // E-commerce примеры:
  // 'доставка': ['отправка', 'shipping', 'курьер', 'почта'],
  // 'оплата': ['платёж', 'payment', 'карта', 'наличные'],
  // 'товар': ['продукт', 'изделие', 'артикул'],

  // Tech примеры:
  // 'api': ['интерфейс', 'endpoint', 'запрос'],
  // 'баг': ['ошибка', 'bug', 'проблема'],
  // 'фича': ['функция', 'feature', 'возможность'],
};

// ============================================================
// 2. КАТЕГОРИИ ДОКУМЕНТОВ
// Для автоматической классификации запросов
// ============================================================
export const CATEGORIES = {
  // faq: {
  //   keywords: ['вопрос', 'как', 'почему', 'можно ли'],
  //   patterns: ['\\?$'],
  // },
  // docs: {
  //   keywords: ['документация', 'инструкция', 'руководство', 'гайд'],
  // },
  // support: {
  //   keywords: ['проблема', 'не работает', 'ошибка', 'помогите'],
  // },
};

// ============================================================
// 3. ПАТТЕРНЫ ДЛЯ ИЗВЛЕЧЕНИЯ ТЕРМИНОВ
// Regex для поиска важных элементов в запросах
// ============================================================
export const QUERY_PATTERNS = {
  identifiers: [
    // Номер заказа: ORDER-12345
    // { regex: 'ORDER[:-]?(\\d+)', flags: 'gi', group: 1 },

    // Тикет: #123
    // { regex: '#(\\d+)', flags: 'gi', group: 1 },

    // Артикул: SKU-ABC123
    // { regex: 'SKU[:-]?([A-Z0-9]+)', flags: 'gi', group: 1 },
  ],
  entities: [
    // Версия: v2.0, версия 2.0
    // { regex: 'v?(\\d+\\.\\d+(?:\\.\\d+)?)', flags: 'i', group: 1 },

    // Дата: 2025-01-15
    // { regex: '(\\d{4}-\\d{2}-\\d{2})', flags: 'gi', group: 1 },
  ],
};

// ============================================================
// 4. ПРАВИЛА ПЕРЕРАНЖИРОВАНИЯ
// Бонусы и штрафы для точности поиска
// ============================================================
export const RERANKING_RULES = [
  // Бонус за точное совпадение идентификатора
  {
    field: 'combined',
    match: { type: 'term', termType: 'identifiers' },
    bonus: 0.5,
  },

  // Штраф за низкое совпадение ключевых слов
  {
    field: 'combined',
    match: { type: 'keyword_ratio', threshold: 0.3 },
    penalty: -0.3,
  },

  // Бонус за совпадение regex паттерна
  // {
  //   field: 'title',
  //   match: { type: 'regex', pattern: 'FAQ|Инструкция' },
  //   bonus: 0.2,
  // },
];

// ============================================================
// 5. ВЕБ-ПОИСК (опционально)
// ============================================================

// Фразы, которые автоматически включают веб-поиск
export const WEB_SEARCH_TRIGGERS = [
  // 'актуальная информация',
  // 'последние новости',
  // '2025 год',
  // 'текущая версия',
];

// Приоритет доменов для веб-результатов (10 = высший)
export const DOMAIN_PRIORITY = {
  // 'docs.example.com': 10,
  // 'stackoverflow.com': 8,
  // 'github.com': 7,
  // 'wikipedia.org': 5,
};

// ============================================================
// 6. SYSTEM PROMPT
// Личность и поведение AI
// ============================================================
export const SYSTEM_PROMPT = `Ты — AI-ассистент.

=== ИСТОЧНИКИ ИНФОРМАЦИИ ===
1. Документы из базы знаний (приоритет)
2. Веб-результаты (для актуальной информации)

=== СТИЛЬ ===
- Отвечай чётко и по существу
- Ссылайся на источники
- Структурируй ответ

=== ПРАВИЛА ===
1. Не выдумывай факты
2. Если информации нет — скажи об этом
3. Отвечай на русском языке`;

// ============================================================
// 7. ФУНКЦИЯ СОЗДАНИЯ КОНФИГУРАЦИИ
// ============================================================
export function createConfig(customConfig = {}) {
  return {
    systemPrompt: customConfig.systemPrompt || SYSTEM_PROMPT,

    grokConfig: {
      synonyms: { ...SYNONYMS, ...customConfig.synonyms },
      categories: { ...CATEGORIES, ...customConfig.categories },
      queryPatterns: { ...QUERY_PATTERNS, ...customConfig.queryPatterns },
      rerankingRules: customConfig.rerankingRules || RERANKING_RULES,
    },

    webSearch: {
      enabled: customConfig.webSearchEnabled || false,
      cseId: process.env.GOOGLE_CSE_ID,
      triggers: customConfig.webSearchTriggers || WEB_SEARCH_TRIGGERS,
      domainPriority: { ...DOMAIN_PRIORITY, ...customConfig.domainPriority },
    },

    chatModel: customConfig.chatModel || 'gemini-3-pro-preview',
    searchLimit: customConfig.searchLimit || 20,
    temperature: customConfig.temperature || 0.7,
    maxOutputTokens: customConfig.maxOutputTokens || 8192,

    ...customConfig,
  };
}

// ============================================================
// ЭКСПОРТ
// ============================================================
export default {
  SYNONYMS,
  CATEGORIES,
  QUERY_PATTERNS,
  RERANKING_RULES,
  WEB_SEARCH_TRIGGERS,
  DOMAIN_PRIORITY,
  SYSTEM_PROMPT,
  createConfig,
};
