const $ = (selector) => document.querySelector(selector);

let items = [];
let currentId = null;
let filter = 'all';
let saveTimer;
let deferredPrompt;

const fields = [
  'title',
  'type',
  'collection',
  'tags',
  'characterName',
  'variantName',
  'age',
  'timeline',
  'content'
];

const typeLabels = {
  prompt: 'Prompt',
  starter: 'Starter',
  rule: 'Regel',
  character: 'Karaktär',
  note: 'Anteckning'
};

const dbp = new Promise((resolve, reject) => {
  const request = indexedDB.open('prompt-grimoire', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('data');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function dbGet() {
  const db = await dbp;
  return new Promise((resolve, reject) => {
    const request = db.transaction('data').objectStore('data').get('items');
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function dbSet(value) {
  const db = await dbp;
  return new Promise((resolve, reject) => {
    const request = db.transaction('data', 'readwrite').objectStore('data').put(value, 'items');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function markdown(markdownText = '') {
  let output = escapeHtml(markdownText);
  output = output
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^[-*] (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  return output
    .split(/\n{2,}/)
    .map((block) => /^<(h|ul|pre|blockquote)/.test(block)
      ? block
      : `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function typeName(type) {
  return typeLabels[type] || type;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function normalizedTags(item) {
  return String(item.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function matchesCurrentFilters(item) {
  const query = $('#searchInput').value.trim().toLowerCase();
  const selectedCollection = $('#collectionFilter').value;
  const matchesType = filter === 'all'
    || (filter === 'favorite' && item.favorite)
    || item.type === filter;
  const matchesCollection = selectedCollection === 'all'
    || (selectedCollection === '__none__' && !item.collection)
    || item.collection === selectedCollection;
  const searchable = [
    item.title,
    item.collection,
    item.tags,
    item.content,
    item.characterName,
    item.variantName,
    item.timeline,
    item.age
  ].join(' ').toLowerCase();

  return matchesType && matchesCollection && searchable.includes(query);
}

function sortedItems(list) {
  const sort = $('#sortSelect').value;
  return [...list].sort((a, b) => {
    if (sort === 'title-asc') return (a.title || '').localeCompare(b.title || '', 'sv');
    if (sort === 'created-desc') return (b.created || 0) - (a.created || 0);
    if (sort === 'type-asc') {
      const typeResult = typeName(a.type).localeCompare(typeName(b.type), 'sv');
      return typeResult || (a.title || '').localeCompare(b.title || '', 'sv');
    }
    return (b.updated || 0) - (a.updated || 0);
  });
}

function updateCounts() {
  const counts = {
    all: items.length,
    favorite: items.filter((item) => item.favorite).length
  };
  Object.keys(typeLabels).forEach((type) => {
    counts[type] = items.filter((item) => item.type === type).length;
  });
  document.querySelectorAll('[data-count]').forEach((badge) => {
    badge.textContent = counts[badge.dataset.count] || 0;
  });
}

function updateCollections() {
  const collections = [...new Set(items.map((item) => String(item.collection || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'sv'));
  const currentFilter = $('#collectionFilter').value;
  $('#collectionFilter').innerHTML = [
    '<option value="all">Alla samlingar</option>',
    '<option value="__none__">Utan samling</option>',
    ...collections.map((collection) => `<option value="${escapeHtml(collection)}">${escapeHtml(collection)}</option>`)
  ].join('');
  if ([...$('#collectionFilter').options].some((option) => option.value === currentFilter)) {
    $('#collectionFilter').value = currentFilter;
  }
  $('#collectionSuggestions').innerHTML = collections
    .map((collection) => `<option value="${escapeHtml(collection)}"></option>`)
    .join('');
}

function itemCard(item) {
  const tags = normalizedTags(item).slice(0, 2);
  const characterLine = item.type === 'character'
    ? [item.characterName, item.variantName].filter(Boolean).join(' · ')
    : '';
  return `
    <button class="item ${item.id === currentId ? 'active' : ''}" data-id="${item.id}">
      <span class="item-row">
        <span class="item-title">${escapeHtml(item.title || 'Namnlös')}</span>
        ${item.favorite ? '<span class="item-star" aria-label="Favorit">★</span>' : ''}
      </span>
      ${characterLine ? `<span class="item-character">${escapeHtml(characterLine)}</span>` : ''}
      <span class="item-meta">
        <span class="meta-pill type">${typeName(item.type)}</span>
        ${item.collection ? `<span class="meta-pill">${escapeHtml(item.collection)}</span>` : ''}
        ${tags.map((tag) => `<span class="tag-pill">#${escapeHtml(tag)}</span>`).join('')}
      </span>
    </button>`;
}

function groupVisibleItems(visible) {
  if (filter === 'character') {
    const groups = new Map();
    visible.forEach((item) => {
      const key = item.characterName?.trim() || 'Övriga karaktärer';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'sv'));
  }

  if (filter === 'all') {
    const typeOrder = ['character', 'prompt', 'starter', 'rule', 'note'];
    return typeOrder
      .map((type) => [typeName(type), visible.filter((item) => item.type === type)])
      .filter(([, groupItems]) => groupItems.length);
  }

  const collectionGroups = new Map();
  visible.forEach((item) => {
    const key = item.collection?.trim() || 'Utan samling';
    if (!collectionGroups.has(key)) collectionGroups.set(key, []);
    collectionGroups.get(key).push(item);
  });
  return [...collectionGroups.entries()].sort(([a], [b]) => a.localeCompare(b, 'sv'));
}

function renderList() {
  updateCounts();
  updateCollections();
  const visible = sortedItems(items.filter(matchesCurrentFilters));
  $('#resultCount').textContent = `${visible.length} ${visible.length === 1 ? 'post' : 'poster'}`;
  $('#resultLabel').textContent = filter === 'all' ? 'Bibliotek' : filter === 'favorite' ? 'Favoriter' : typeName(filter);

  if (!visible.length) {
    $('#itemList').innerHTML = '<div class="empty-list">Inga poster matchar ditt filter.</div>';
    return;
  }

  const groups = groupVisibleItems(visible);
  $('#itemList').innerHTML = groups.map(([groupName, groupItems]) => `
    <section class="list-group">
      <div class="group-title">${escapeHtml(groupName)} <span>${groupItems.length}</span></div>
      ${groupItems.map(itemCard).join('')}
    </section>`).join('');

  document.querySelectorAll('.item').forEach((button) => {
    button.onclick = () => openItem(button.dataset.id);
  });
}

function openItem(id) {
  currentId = id;
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  $('#emptyState').hidden = true;
  $('#editor').hidden = false;
  fields.forEach((field) => {
    $('#' + field).value = item[field] || '';
  });
  $('#favoriteBtn').textContent = item.favorite ? '★' : '☆';
  $('#favoriteBtn').setAttribute('aria-label', item.favorite ? 'Ta bort från favoriter' : 'Markera som favorit');
  $('#characterFields').hidden = item.type !== 'character';
  $('#typeBadge').textContent = typeName(item.type);
  $('#updatedLabel').textContent = item.updated ? `Ändrad ${formatDate(item.updated)}` : '';
  $('#preview').innerHTML = markdown(item.content);
  renderList();
}

function current() {
  return items.find((item) => item.id === currentId);
}

function scheduleSave() {
  const item = current();
  if (!item) return;

  fields.forEach((field) => {
    item[field] = $('#' + field).value;
  });
  item.favorite = $('#favoriteBtn').textContent === '★';
  item.updated = Date.now();

  $('#characterFields').hidden = item.type !== 'character';
  $('#typeBadge').textContent = typeName(item.type);
  $('#updatedLabel').textContent = 'Ändras nu';
  $('#preview').innerHTML = markdown(item.content);
  $('#saveStatus').textContent = 'Sparar…';

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await dbSet(items);
    $('#saveStatus').textContent = 'Sparad';
    $('#updatedLabel').textContent = `Ändrad ${formatDate(item.updated)}`;
    renderList();
  }, 350);
}

function createItem(type, title, collection = '') {
  const item = {
    id: uid(),
    type,
    title: title || `Ny ${typeName(type).toLowerCase()}`,
    collection,
    tags: '',
    content: '',
    favorite: false,
    characterName: '',
    variantName: '',
    age: '',
    timeline: '',
    created: Date.now(),
    updated: Date.now()
  };
  items.push(item);
  dbSet(items);
  openItem(item.id);
  setTimeout(() => $('#title').focus(), 0);
}

function openCreateDialog(preselectedType = 'prompt') {
  $('#newType').value = preselectedType;
  $('#newTitle').value = '';
  $('#newCollection').value = $('#collectionFilter').value === 'all' || $('#collectionFilter').value === '__none__'
    ? ''
    : $('#collectionFilter').value;
  $('#newDialog').showModal();
}

function download(name, text, type) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([text], { type }));
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

fields.forEach((field) => {
  $('#' + field).addEventListener(field === 'type' ? 'change' : 'input', scheduleSave);
});

$('#searchInput').oninput = renderList;
$('#sortSelect').onchange = renderList;
$('#collectionFilter').onchange = renderList;

$('#filters').addEventListener('click', (event) => {
  const button = event.target.closest('.filter');
  if (!button) return;
  document.querySelector('.filter.active')?.classList.remove('active');
  button.classList.add('active');
  filter = button.dataset.filter;
  renderList();
});

$('#newBtn').onclick = () => openCreateDialog('prompt');
$('#emptyCreateBtn').onclick = () => openCreateDialog('prompt');
document.querySelectorAll('[data-quick-type]').forEach((button) => {
  button.onclick = () => openCreateDialog(button.dataset.quickType);
});

$('#createBtn').onclick = (event) => {
  event.preventDefault();
  const title = $('#newTitle').value.trim();
  if (!title) return;
  createItem($('#newType').value, title, $('#newCollection').value.trim());
  $('#newDialog').close();
};

$('#favoriteBtn').onclick = () => {
  $('#favoriteBtn').textContent = $('#favoriteBtn').textContent === '★' ? '☆' : '★';
  scheduleSave();
};

$('#deleteBtn').onclick = () => {
  const item = current();
  if (item && confirm(`Radera “${item.title}”?`)) {
    items = items.filter((entry) => entry.id !== currentId);
    currentId = null;
    dbSet(items);
    $('#editor').hidden = true;
    $('#emptyState').hidden = false;
    renderList();
  }
};

$('#duplicateBtn').onclick = () => {
  const item = current();
  if (!item) return;
  const copy = {
    ...item,
    id: uid(),
    title: `${item.title} – kopia`,
    created: Date.now(),
    updated: Date.now()
  };
  items.push(copy);
  dbSet(items);
  openItem(copy.id);
};

$('#copyBtn').onclick = async () => {
  await navigator.clipboard.writeText($('#content').value);
  const previous = $('#copyBtn').textContent;
  $('#copyBtn').textContent = 'Kopierad';
  setTimeout(() => { $('#copyBtn').textContent = previous; }, 1200);
};

document.querySelectorAll('[data-md]').forEach((button) => {
  button.onclick = () => {
    const textarea = $('#content');
    const [before, after] = button.dataset.md.split('|');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    textarea.setRangeText(before + selected + after, start, end, 'select');
    textarea.focus();
    scheduleSave();
  };
});

function setMode(mode) {
  const pane = $('#editorPane');
  pane.className = 'editor-pane'
    + (mode === 'split' ? ' split' : mode === 'preview' ? ' preview-only' : '');
  ['Edit', 'Split', 'Preview'].forEach((name) => {
    $('#mode' + name).classList.toggle('active', name.toLowerCase() === mode);
  });
}

$('#modeEdit').onclick = () => setMode('edit');
$('#modeSplit').onclick = () => setMode('split');
$('#modePreview').onclick = () => setMode('preview');

$('#exportBtn').onclick = () => download(
  `prompt-grimoire-${new Date().toISOString().slice(0, 10)}.json`,
  JSON.stringify({ version: 2, exported: new Date().toISOString(), items }, null, 2),
  'application/json'
);

$('#importInput').onchange = async (event) => {
  try {
    const file = event.target.files[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(incoming)) throw new Error('Ogiltigt format');

    if (confirm(`Importera ${incoming.length} poster? De läggs till i grimoaren.`)) {
      const knownIds = new Set(items.map((item) => item.id));
      incoming.forEach((item) => {
        items.push({
          ...item,
          id: knownIds.has(item.id) ? uid() : item.id || uid(),
          collection: item.collection || '',
          updated: Date.now()
        });
      });
      await dbSet(items);
      renderList();
    }
  } catch {
    alert('Filen kunde inte läsas som en Prompt Grimoire-säkerhetskopia.');
  }
  event.target.value = '';
};

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  $('#installBtn').hidden = false;
});

$('#installBtn').onclick = async () => {
  await deferredPrompt?.prompt();
  deferredPrompt = null;
  $('#installBtn').hidden = true;
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

(async () => {
  items = await dbGet();
  items = items.map((item) => ({ collection: '', ...item }));
  if (!items.length) {
    items = [{
      id: uid(),
      type: 'rule',
      title: 'Grundregler för rollspel',
      collection: 'Grundregler',
      tags: 'regler, metaspel',
      content: '# Grundregler\n\n- Inget metaspelande.\n- Karaktärer känner bara till sådant de har upplevt eller fått berättat för sig.\n- AI:n beskriver aldrig spelarens karaktärs tankar, repliker eller reaktioner.',
      favorite: true,
      characterName: '',
      variantName: '',
      age: '',
      timeline: '',
      created: Date.now(),
      updated: Date.now()
    }];
    await dbSet(items);
  }
  renderList();
})();
