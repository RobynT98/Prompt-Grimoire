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
      const next = lines[index + 1] || '';

      if (/^```/.test(line.trim())) {
        flushParagraph();
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^```/.test(lines[index].trim())) {
          codeLines.push(lines[index]);
          index += 1;
        }
        blocks.push(`<pre><code>${escape(codeLines.join('\n'))}</code></pre>`);
        index += 1;
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

      if (/^[-*]\s+/.test(line)) {
        flushParagraph();
        const listItems = [];
        while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
          listItems.push(lines[index].replace(/^[-*]\s+/, ''));
          index += 1;
        }
        blocks.push(`<ul>${listItems.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        flushParagraph();
        const listItems = [];
        while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
          listItems.push(lines[index].replace(/^\d+\.\s+/, ''));
          index += 1;
        }
        blocks.push(`<ol>${listItems.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
        continue;
      }

      if (/^(?:---+|___+|\*\*\*+)$/.test(line.trim())) {
        flushParagraph();
        blocks.push('<hr>');
        index += 1;
        continue;
      }

      if (!line.trim()) {
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

  const separatorButton = document.getElementById('separatorBtn');
  if (separatorButton) {
    separatorButton.addEventListener('click', () => {
      const textarea = document.getElementById('content');
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const beforeText = textarea.value.slice(0, start);
      const afterText = textarea.value.slice(end);
      const prefix = beforeText && !beforeText.endsWith('\n\n')
        ? (beforeText.endsWith('\n') ? '\n' : '\n\n')
        : '';
      const suffix = afterText && !afterText.startsWith('\n\n')
        ? (afterText.startsWith('\n') ? '\n' : '\n\n')
        : '';
      const insertion = `${prefix}---${suffix}`;

      textarea.setRangeText(insertion, start, end, 'end');
      textarea.focus();
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
      const prefix = beforeText && !beforeText.endsWith('\n\n')
        ? (beforeText.endsWith('\n') ? '\n' : '\n\n')
        : '';
      const suffix = afterText && !afterText.startsWith('\n\n')
        ? (afterText.startsWith('\n') ? '\n' : '\n\n')
        : '';
      const content = selected || 'SYSTEM-MOTOR: ';
      const insertion = `${prefix}\`\`\`\n${content}\n\`\`\`${suffix}`;
      const contentStart = start + prefix.length + 4;
      const contentEnd = contentStart + content.length;

      textarea.setRangeText(insertion, start, end, 'end');
      textarea.focus();
      textarea.setSelectionRange(contentStart, contentEnd);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
})();
