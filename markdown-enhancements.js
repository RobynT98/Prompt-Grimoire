(() => {
  const escape = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  const inline = (value = '') => escape(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const splitCells = (line) => line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  const isSeparator = (line) => {
    const cells = splitCells(line);
    return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  };

  const renderTable = (headerLine, bodyLines) => {
    const headers = splitCells(headerLine);
    const rows = bodyLines.map(splitCells);
    return `<div class="table-scroll" role="region" aria-label="Markdown-tabell" tabindex="0">
      <table>
        <thead><tr>${headers.map((cell) => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${headers.map((_, index) => `<td>${inline(row[index] || '')}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
  };

  const matchListItem = (line = '') => {
    const match = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (!match) return null;
    const whitespace = match[1].replace(/\t/g, '    ');
    return {
      indent: whitespace.length,
      ordered: /\d+\./.test(match[2]),
      text: match[3]
    };
  };

  const renderList = (lines, startIndex, forcedIndent) => {
    const first = matchListItem(lines[startIndex]);
    if (!first) return null;

    const baseIndent = forcedIndent ?? first.indent;
    const ordered = first.ordered;
    const tag = ordered ? 'ol' : 'ul';
    const items = [];
    let index = startIndex;

    while (index < lines.length) {
      const current = matchListItem(lines[index]);
      if (!current || current.indent !== baseIndent || current.ordered !== ordered) break;

      let itemContent = inline(current.text);
      index += 1;

      while (index < lines.length) {
        const nextLine = lines[index];
        const nextItem = matchListItem(nextLine);

        if (!nextLine.trim()) {
          const afterBlank = matchListItem(lines[index + 1] || '');
          if (afterBlank && afterBlank.indent > baseIndent) {
            index += 1;
            const nested = renderList(lines, index, afterBlank.indent);
            if (nested) {
              itemContent += nested.html;
              index = nested.nextIndex;
              continue;
            }
          }
          break;
        }

        if (nextItem && nextItem.indent > baseIndent) {
          const nested = renderList(lines, index, nextItem.indent);
          if (nested) {
            itemContent += nested.html;
            index = nested.nextIndex;
            continue;
          }
        }

        if (nextItem && nextItem.indent <= baseIndent) break;

        const continuationIndent = (nextLine.match(/^(\s*)/)?.[1] || '').replace(/\t/g, '    ').length;
        if (continuationIndent > baseIndent) {
          itemContent += `<br>${inline(nextLine.trim())}`;
          index += 1;
          continue;
        }

        break;
      }

      items.push(`<li>${itemContent}</li>`);
    }

    return {
      html: `<${tag}>${items.join('')}</${tag}>`,
      nextIndex: index
    };
  };

  window.markdown = function renderMarkdown(markdownText = '') {
    const lines = String(markdownText).replace(/\r\n?/g, '\n').split('\n');
    const blocks = [];
    let index = 0;
    let paragraph = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      blocks.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
      paragraph = [];
    };

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();
      const next = lines[index + 1] || '';

      const compactFence = trimmed.match(/^```\s*(.*?)\s*```$/);
      if (compactFence && compactFence[1]) {
        flushParagraph();
        blocks.push(`<div class="code-label"><code>${escape(compactFence[1])}</code></div>`);
        index += 1;
        continue;
      }

      if (/^```(?:[a-zA-Z0-9_-]+)?\s*$/.test(trimmed)) {
        flushParagraph();
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
          codeLines.push(lines[index]);
          index += 1;
        }
        blocks.push(`<pre><code>${escape(codeLines.join('\n'))}</code></pre>`);
        if (index < lines.length) index += 1;
        continue;
      }

      if (line.includes('|') && isSeparator(next)) {
        flushParagraph();
        const bodyLines = [];
        index += 2;
        while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
          bodyLines.push(lines[index]);
          index += 1;
        }
        blocks.push(renderTable(line, bodyLines));
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        index += 1;
        continue;
      }

      if (/^>\s?/.test(line)) {
        flushParagraph();
        const quoteLines = [];
        while (index < lines.length && /^>\s?/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^>\s?/, ''));
          index += 1;
        }
        blocks.push(`<blockquote>${quoteLines.map(inline).join('<br>')}</blockquote>`);
        continue;
      }

      const listStart = matchListItem(line);
      if (listStart) {
        flushParagraph();
        const renderedList = renderList(lines, index, listStart.indent);
        if (renderedList) {
          blocks.push(renderedList.html);
          index = renderedList.nextIndex;
          continue;
        }
      }

      if (/^(?:---+|___+|\*\*\*+)$/.test(trimmed)) {
        flushParagraph();
        blocks.push('<hr>');
        index += 1;
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        index += 1;
        continue;
      }

      paragraph.push(line);
      index += 1;
    }

    flushParagraph();
    return blocks.join('');
  };

  function surroundingSpacing(textBefore, textAfter) {
    const prefix = textBefore && !textBefore.endsWith('\n\n')
      ? (textBefore.endsWith('\n') ? '\n' : '\n\n')
      : '';
    const suffix = textAfter && !textAfter.startsWith('\n\n')
      ? (textAfter.startsWith('\n') ? '\n' : '\n\n')
      : '';
    return { prefix, suffix };
  }

  const separatorButton = document.getElementById('separatorBtn');
  if (separatorButton) {
    separatorButton.addEventListener('click', () => {
      const textarea = document.getElementById('content');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const beforeText = textarea.value.slice(0, start);
      const afterText = textarea.value.slice(end);
      const { prefix, suffix } = surroundingSpacing(beforeText, afterText);
      textarea.setRangeText(`${prefix}---${suffix}`, start, end, 'end');
      textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  const codeLabelButton = document.getElementById('codeLabelBtn');
  if (codeLabelButton) {
    codeLabelButton.addEventListener('click', () => {
      const textarea = document.getElementById('content');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.slice(start, end).replace(/\s*\n\s*/g, ' ').trim();
      const beforeText = textarea.value.slice(0, start);
      const afterText = textarea.value.slice(end);
      const { prefix, suffix } = surroundingSpacing(beforeText, afterText);
      const content = selected || 'SYSTEM-MOTOR: ROLLSPELSREGLER';
      const insertion = `${prefix}\`\`\`${content}\`\`\`${suffix}`;
      const contentStart = start + prefix.length + 3;
      textarea.setRangeText(insertion, start, end, 'end');
      textarea.focus();
      textarea.setSelectionRange(contentStart, contentStart + content.length);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  const codeBlockButton = document.getElementById('codeBlockBtn');
  if (codeBlockButton) {
    codeBlockButton.addEventListener('click', () => {
      const textarea = document.getElementById('content');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.slice(start, end);
      const beforeText = textarea.value.slice(0, start);
      const afterText = textarea.value.slice(end);
      const { prefix, suffix } = surroundingSpacing(beforeText, afterText);
      const content = selected || 'Skriv flera rader här';
      const insertion = `${prefix}\`\`\`\n${content}\n\`\`\`${suffix}`;
      const contentStart = start + prefix.length + 4;
      textarea.setRangeText(insertion, start, end, 'end');
      textarea.focus();
      textarea.setSelectionRange(contentStart, contentStart + content.length);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
})();
