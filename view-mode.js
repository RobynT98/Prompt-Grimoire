(() => {
  const storageKey = 'prompt-grimoire-view-mode';
  const allowedModes = ['edit', 'split', 'preview'];

  function getSavedMode() {
    try {
      const saved = localStorage.getItem(storageKey);
      return allowedModes.includes(saved) ? saved : 'preview';
    } catch {
      return 'preview';
    }
  }

  function saveMode(mode) {
    try {
      localStorage.setItem(storageKey, mode);
    } catch {}
  }

  function applyMode(mode, shouldSave = true) {
    const safeMode = allowedModes.includes(mode) ? mode : 'preview';
    const pane = document.getElementById('editorPane');
    if (!pane) return;

    pane.className = 'editor-pane'
      + (safeMode === 'split' ? ' split' : safeMode === 'preview' ? ' preview-only' : '');

    const buttons = {
      edit: document.getElementById('modeEdit'),
      split: document.getElementById('modeSplit'),
      preview: document.getElementById('modePreview')
    };

    Object.entries(buttons).forEach(([buttonMode, button]) => {
      if (!button) return;
      const isActive = buttonMode === safeMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.setAttribute('aria-pressed', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    document.documentElement.dataset.editorMode = safeMode;
    if (shouldSave) saveMode(safeMode);
  }

  function initialize() {
    const toolbar = document.querySelector('.toolbar');
    const viewTools = document.querySelector('.view-tools');
    const formatTools = document.querySelector('.format-tools');
    if (!toolbar || !viewTools) return;

    viewTools.setAttribute('role', 'tablist');
    viewTools.setAttribute('aria-label', 'Visningsläge');

    if (!viewTools.querySelector('.view-tools-label')) {
      const label = document.createElement('span');
      label.className = 'view-tools-label';
      label.textContent = 'Visning';
      viewTools.prepend(label);
    }

    const modeButtons = [
      ['modeEdit', 'edit', 'Skriv'],
      ['modeSplit', 'split', 'Delad'],
      ['modePreview', 'preview', 'Läs']
    ];

    modeButtons.forEach(([id, mode, label]) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.textContent = label;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'editorPane');
      button.onclick = () => applyMode(mode, true);
    });

    toolbar.prepend(viewTools);
    if (formatTools) formatTools.setAttribute('aria-label', 'Textformatering');
    applyMode(getSavedMode(), false);
  }

  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize, { once: true });
  }
})();
