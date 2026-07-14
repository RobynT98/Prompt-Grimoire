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

(() => {
  const baseMarkdown = window.markdown;
  if (typeof baseMarkdown !== 'function') return;

  function matchListItem(line = '') {
    const match = line.match(/^(\s*)([-*]|(\d+)\.)\s+(.+)$/);
    if (!match) return null;

    const whitespace = match[1].replace(/\t/g, '    ');
    const ordered = Boolean(match[3]);
    return {
      indent: whitespace.length,
      ordered,
      number: ordered ? Number.parseInt(match[3], 10) : null
    };
  }

  function collectList(lines, startIndex, forcedIndent, orderedGroups) {
    const first = matchListItem(lines[startIndex]);
    if (!first) return { nextIndex: startIndex + 1 };

    const baseIndent = forcedIndent ?? first.indent;
    const ordered = first.ordered;
    const group = ordered ? { numbers: [] } : null;
    if (group) orderedGroups.push(group);

    let index = startIndex;
    while (index < lines.length) {
      const current = matchListItem(lines[index]);
      if (!current || current.indent !== baseIndent || current.ordered !== ordered) break;

      if (group) group.numbers.push(current.number);
      index += 1;

      while (index < lines.length) {
        const nextLine = lines[index];
        const nextItem = matchListItem(nextLine);

        if (!nextLine.trim()) {
          const afterBlank = matchListItem(lines[index + 1] || '');
          if (afterBlank && afterBlank.indent > baseIndent) {
            index += 1;
            const nested = collectList(lines, index, afterBlank.indent, orderedGroups);
            index = nested.nextIndex;
            continue;
          }
          break;
        }

        if (nextItem && nextItem.indent > baseIndent) {
          const nested = collectList(lines, index, nextItem.indent, orderedGroups);
          index = nested.nextIndex;
          continue;
        }

        if (nextItem && nextItem.indent <= baseIndent) break;

        const continuationIndent = (nextLine.match(/^(\s*)/)?.[1] || '')
          .replace(/\t/g, '    ').length;
        if (continuationIndent > baseIndent) {
          index += 1;
          continue;
        }

        break;
      }
    }

    return { nextIndex: index };
  }

  function collectOrderedGroups(markdownText = '') {
    const lines = String(markdownText).replace(/\r\n?/g, '\n').split('\n');
    const orderedGroups = [];
    let index = 0;

    while (index < lines.length) {
      const trimmed = lines[index].trim();

      if (/^```\s*.*?\s*```$/.test(trimmed)) {
        index += 1;
        continue;
      }

      if (/^```(?:[a-zA-Z0-9_-]+)?\s*$/.test(trimmed)) {
        index += 1;
        while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
          index += 1;
        }
        if (index < lines.length) index += 1;
        continue;
      }

      const listItem = matchListItem(lines[index]);
      if (listItem) {
        const list = collectList(lines, index, listItem.indent, orderedGroups);
        index = list.nextIndex;
        continue;
      }

      index += 1;
    }

    return orderedGroups;
  }

  window.markdown = function renderMarkdownWithOriginalNumbers(markdownText = '') {
    const rendered = baseMarkdown(markdownText);
    const orderedGroups = collectOrderedGroups(markdownText);
    if (!orderedGroups.length) return rendered;

    const template = document.createElement('template');
    template.innerHTML = rendered;
    const orderedLists = Array.from(template.content.querySelectorAll('ol'));

    orderedGroups.forEach((group, listIndex) => {
      const list = orderedLists[listIndex];
      if (!list || !group.numbers.length) return;

      const firstNumber = group.numbers[0];
      if (Number.isFinite(firstNumber)) list.start = firstNumber;

      const listItems = Array.from(list.children)
        .filter((element) => element.tagName === 'LI');
      listItems.forEach((item, itemIndex) => {
        const explicitNumber = group.numbers[itemIndex];
        if (Number.isFinite(explicitNumber)) item.value = explicitNumber;
      });
    });

    return template.innerHTML;
  };
})();
