/**
 * UI компоненты для веб-поиска
 *
 * Для проекта 333 (юридическое приложение)
 *
 * Использование:
 * 1. Подключите этот файл в ваш HTML
 * 2. Добавьте toggle переключатель
 * 3. При отправке сообщения передавайте состояние toggle
 */

/**
 * Создание HTML для toggle переключателя веб-поиска
 * Вставьте этот HTML в форму отправки сообщений
 */
export const webSearchToggleHTML = `
<label class="web-search-toggle" title="Поиск актуальной информации в интернете">
  <input type="checkbox" id="webSearchToggle">
  <span class="toggle-icon">🌐</span>
  <span class="toggle-label">Поиск в сети</span>
</label>
`;

/**
 * CSS стили для toggle
 */
export const webSearchToggleCSS = `
.web-search-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 20px;
  background: #f0f0f0;
  transition: all 0.2s ease;
  font-size: 14px;
  user-select: none;
}

.web-search-toggle:hover {
  background: #e0e0e0;
}

.web-search-toggle input[type="checkbox"] {
  display: none;
}

.web-search-toggle input[type="checkbox"]:checked + .toggle-icon {
  color: #4CAF50;
}

.web-search-toggle input[type="checkbox"]:checked ~ .toggle-label {
  color: #4CAF50;
  font-weight: 500;
}

.web-search-toggle .toggle-icon {
  font-size: 16px;
  transition: color 0.2s ease;
}

.web-search-toggle .toggle-label {
  color: #666;
  transition: color 0.2s ease;
}

/* Индикатор автоматического веб-поиска */
.auto-web-search-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  background: #e3f2fd;
  color: #1976d2;
  font-size: 12px;
  margin-left: 8px;
}

/* Стили для веб-источников в ответе */
.web-sources {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #1976d2;
}

.web-sources-title {
  font-weight: 600;
  color: #1976d2;
  margin-bottom: 8px;
  font-size: 14px;
}

.web-source-item {
  display: block;
  padding: 6px 0;
  color: #1976d2;
  text-decoration: none;
  font-size: 13px;
  border-bottom: 1px solid #e0e0e0;
}

.web-source-item:last-child {
  border-bottom: none;
}

.web-source-item:hover {
  text-decoration: underline;
}

.web-source-domain {
  color: #666;
  font-size: 11px;
  margin-left: 8px;
}
`;

/**
 * Функция отправки сообщения с веб-поиском
 * Интегрируйте в вашу логику отправки
 */
export async function sendMessageWithWebSearch(message, history = [], appContext = '') {
  const webSearchToggle = document.getElementById('webSearchToggle');
  const webSearchEnabled = webSearchToggle?.checked || false;

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      appContext,
      webSearchEnabled,
    }),
  });

  if (!response.ok) {
    throw new Error('Ошибка отправки сообщения');
  }

  return response.json();
}

/**
 * Отображение веб-источников в ответе
 * @param {Array} webSources - Массив источников из ответа API
 * @param {boolean} autoUsed - Был ли использован автоматический поиск
 * @returns {string} - HTML для отображения
 */
export function renderWebSources(webSources, autoUsed = false) {
  if (!webSources || webSources.length === 0) {
    return '';
  }

  const autoLabel = autoUsed
    ? '<span class="auto-web-search-badge">🔍 Авто-поиск</span>'
    : '';

  const sources = webSources.map(s => `
    <a href="${s.url}" target="_blank" rel="noopener" class="web-source-item">
      ${s.title}
      <span class="web-source-domain">(${s.source})</span>
    </a>
  `).join('');

  return `
    <div class="web-sources">
      <div class="web-sources-title">
        🌐 Веб-источники ${autoLabel}
      </div>
      ${sources}
    </div>
  `;
}

/**
 * Инициализация UI компонентов
 * Вызовите после загрузки DOM
 */
export function initWebSearchUI() {
  // Добавляем стили
  if (!document.getElementById('web-search-styles')) {
    const style = document.createElement('style');
    style.id = 'web-search-styles';
    style.textContent = webSearchToggleCSS;
    document.head.appendChild(style);
  }

  // Восстанавливаем состояние toggle из localStorage
  const toggle = document.getElementById('webSearchToggle');
  if (toggle) {
    const savedState = localStorage.getItem('webSearchEnabled');
    if (savedState === 'true') {
      toggle.checked = true;
    }

    // Сохраняем состояние при изменении
    toggle.addEventListener('change', (e) => {
      localStorage.setItem('webSearchEnabled', e.target.checked);
    });
  }

  console.log('[WebSearchUI] Initialized');
}

// Автоматическая инициализация при загрузке
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebSearchUI);
  } else {
    initWebSearchUI();
  }
}

export default {
  webSearchToggleHTML,
  webSearchToggleCSS,
  sendMessageWithWebSearch,
  renderWebSources,
  initWebSearchUI,
};
