// Rutube no comments - Popup Script
// Управление переключателем вкл/выкл

(function() {
  'use strict';

  // Определение темы браузера
  function detectTheme() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    
    // Слушаем изменения темы
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      });
    }
  }

  // Ждем загрузки DOM
  function init() {
    const toggle = document.getElementById('toggle');
    const statusText = document.getElementById('status');
    const statusIndicator = document.getElementById('statusIndicator');
    
    if (!toggle || !statusText || !statusIndicator) {
      console.error('Popup elements not found');
      return;
    }
    
    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

    // Определяем тему при загрузке
    detectTheme();

    // Загрузка текущего состояния
    function loadState() {
      storage.local.get(['enabled'], (result) => {
        const isEnabled = result.enabled !== false; // По умолчанию включено
        toggle.checked = isEnabled;
        updateStatus(isEnabled);
      });
    }

    // Обновление текста статуса и индикатора
    function updateStatus(isEnabled) {
      if (isEnabled) {
        statusText.textContent = 'Включено';
        statusText.className = 'status-text enabled';
        statusIndicator.className = 'status-indicator active';
      } else {
        statusText.textContent = 'Выключено';
        statusText.className = 'status-text disabled';
        statusIndicator.className = 'status-indicator inactive';
      }
    }

    // Обработка изменения переключателя
    toggle.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      storage.local.set({ enabled: isEnabled }, () => {
        const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
        if (runtime.lastError) {
          console.error('Storage error:', runtime.lastError);
          return;
        }
        updateStatus(isEnabled);
        // Изменения автоматически обрабатываются через storage.onChanged в content.js
      });
    });

    // Инициализация
    loadState();
  }

  // Запуск при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
