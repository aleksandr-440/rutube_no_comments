// Rutube no comments - Content Script
// Скрывает блоки комментариев на rutube.ru

(function() {
  'use strict';

  let isEnabled = true;
  let observer = null;
  let hiddenElements = new WeakSet(); // Для отслеживания скрытых элементов

  // Селекторы для поиска блоков комментариев на rutube.ru
  const COMMENT_SELECTORS = [
    '[class*="comment"]',
    '[id*="comment"]',
    '[class*="Comment"]',
    '[id*="Comment"]',
    'section[class*="comment"]',
    'div[class*="comment"]',
    'aside[class*="comment"]'
  ];

  // Функция для скрытия комментариев
  function hideComments() {
    if (!isEnabled) return;

    let hiddenCount = 0;
    
    COMMENT_SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Проверяем, что элемент действительно связан с комментариями
          const text = element.textContent || '';
          const className = element.className || '';
          const id = element.id || '';
          
          // Исключаем элементы, которые не являются блоками комментариев
          if (isCommentBlock(element, text, className, id)) {
            if (element.style.display !== 'none') {
              element.style.display = 'none';
              hiddenElements.add(element);
              hiddenCount++;
            }
          }
        });
      } catch (e) {
        // Игнорируем ошибки селекторов
      }
    });

    return hiddenCount;
  }

  // Проверка, является ли элемент блоком комментариев
  function isCommentBlock(element, text, className, id) {
    const lowerText = text.toLowerCase();
    const lowerClass = className.toLowerCase();
    const lowerId = id.toLowerCase();
    
    // Ищем ключевые слова, связанные с комментариями
    const commentKeywords = [
      'комментар',
      'comment',
      'ответ',
      'reply',
      'написать комментарий',
      'write comment'
    ];
    
    // Проверяем наличие ключевых слов
    const hasCommentKeyword = commentKeywords.some(keyword => 
      lowerText.includes(keyword) || lowerClass.includes(keyword) || lowerId.includes(keyword)
    );
    
    if (!hasCommentKeyword) return false;
    
    // Исключаем маленькие элементы (вероятно, это кнопки или ссылки)
    const rect = element.getBoundingClientRect();
    if (rect.height < 50 && rect.width < 100) return false;
    
    // Исключаем элементы, которые уже скрыты родителями
    if (element.offsetParent === null && element.style.display !== 'none') {
      return false;
    }
    
    return true;
  }

  // Инициализация скрытия комментариев
  function initCommentHiding() {
    // Скрываем комментарии сразу
    hideComments();
    
    // Скрываем комментарии после полной загрузки страницы
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(hideComments, 500);
      });
    } else {
      setTimeout(hideComments, 500);
    }

    // MutationObserver для отслеживания динамически добавляемых элементов
    if (observer) {
      observer.disconnect();
    }
    
    // Используем debounce для оптимизации
    let checkTimeout = null;
    const debouncedHideComments = () => {
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
      checkTimeout = setTimeout(() => {
        if (isEnabled) {
          hideComments();
        }
      }, 100);
    };
    
    observer = new MutationObserver((mutations) => {
      if (!isEnabled) return;
      
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        // Проверяем добавленные узлы
        if (mutation.addedNodes.length > 0) {
          shouldCheck = true;
        }
        // Проверяем изменения атрибутов (например, class, id)
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'id')) {
          shouldCheck = true;
        }
      });
      
      if (shouldCheck) {
        debouncedHideComments();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id']
    });
  }

  // Обработка навигации
  function setupNavigationHandlers() {
    // Отслеживание изменений URL (SPA навигация через History API)
    let lastUrl = location.href;
    
    // Перехватываем pushState и replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (isEnabled) {
          setTimeout(hideComments, 300);
        }
      }
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (isEnabled) {
          setTimeout(hideComments, 300);
        }
      }
    };
    
    // Отслеживание событий popstate (назад/вперед)
    window.addEventListener('popstate', () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (isEnabled) {
          setTimeout(hideComments, 300);
        }
      }
    });
    
    // Отслеживание кликов по ссылкам (для обычной навигации)
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a');
      if (target && target.href && target.href.includes('rutube.ru') && !target.target) {
        // Обычная навигация - страница перезагрузится, content script запустится заново
        // SPA навигация обрабатывается через pushState выше
      }
    }, true);
  }

  // Загрузка состояния из storage
  function loadState() {
    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
    storage.local.get(['enabled'], (result) => {
      isEnabled = result.enabled !== false; // По умолчанию включено
      if (isEnabled) {
        initCommentHiding();
      }
    });
  }

  // Слушаем изменения состояния из popup
  function setupStorageListener() {
    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
    storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.enabled) {
        isEnabled = changes.enabled.newValue !== false;
        if (isEnabled) {
          initCommentHiding();
        } else {
          // Показываем комментарии обратно
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          // Восстанавливаем видимость всех скрытых элементов
          COMMENT_SELECTORS.forEach(selector => {
            try {
              document.querySelectorAll(selector).forEach(el => {
                if (el.style.display === 'none') {
                  el.style.display = '';
                  hiddenElements.delete(el);
                }
              });
            } catch (e) {
              // Игнорируем ошибки селекторов
            }
          });
        }
      }
    });
  }

  // Инициализация
  function init() {
    loadState();
    setupStorageListener();
    setupNavigationHandlers();
  }

  // Запуск при загрузке скрипта
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
