(() => {
  const storageKey = 'prompt-grimoire-theme';
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function getSavedTheme() {
    try {
      return localStorage.getItem(storageKey) || 'system';
    } catch {
      return 'system';
    }
  }

  function resolveTheme(value) {
    if (value !== 'system') return value;
    return media && media.matches ? 'dark' : 'light';
  }

  function applyTheme(value, save) {
    const safeValue = ['system', 'dark', 'light'].includes(value) ? value : 'system';
    if (safeValue === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', safeValue);
    }

    const select = document.getElementById('themeSelect');
    if (select) select.value = safeValue;
    if (themeMeta) themeMeta.setAttribute('content', resolveTheme(safeValue) === 'dark' ? '#07130f' : '#eef3ef');

    if (save) {
      try {
        localStorage.setItem(storageKey, safeValue);
      } catch {}
    }
  }

  function initializeTheme() {
    applyTheme(getSavedTheme(), false);
    const select = document.getElementById('themeSelect');
    if (select) {
      select.addEventListener('change', () => applyTheme(select.value, true));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme, { once: true });
  } else {
    initializeTheme();
  }

  if (media) {
    const handleSystemThemeChange = () => {
      if (getSavedTheme() === 'system') applyTheme('system', false);
    };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', handleSystemThemeChange);
    else if (typeof media.addListener === 'function') media.addListener(handleSystemThemeChange);
  }
})();

(() => {
  if (!document.querySelector('link[data-view-mode-style]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'view-mode.css?v=9';
    link.dataset.viewModeStyle = 'true';
    document.head.appendChild(link);
  }

  if (!document.querySelector('script[data-view-mode-script]')) {
    const script = document.createElement('script');
    script.src = 'view-mode.js?v=9';
    script.dataset.viewModeScript = 'true';
    document.head.appendChild(script);
  }
})();
