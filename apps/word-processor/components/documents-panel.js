// components/documents-panel.js

export class DocumentsPanel extends HTMLElement {
  constructor() {
    super();
    this.documents = [];
  }

  connectedCallback() {
    this.render();
    this.loadDocuments();

    // Listen for doc events
    if (window.swat) {
      window.swat.eventBus.on('doc:saved', () => this.loadDocuments());
      window.swat.eventBus.on('doc:new', () => this.loadDocuments());
      // Toggle visibility on small screens when toolbar requests it
      window.swat.eventBus.on('docs:toggle', () => {
        this.classList.toggle('collapsed');
      });
    }

    // On small screens start collapsed; also listen for screen size changes
    if (window.matchMedia) {
      const mq = window.matchMedia('(max-width: 900px)');
      const setCollapsed = (m) => {
        if (m.matches) {
          this.classList.add('collapsed');
        } else {
          this.classList.remove('collapsed');
        }
      };
      setCollapsed(mq);
      try { mq.addEventListener('change', (e) => setCollapsed(e)); } catch (e) { mq.addListener((e) => setCollapsed(e)); }
    }
  }

  async loadDocuments() {
    if (!window.swat) return;

    try {
      // Ensure we list the docs directory and read metadata files.
      const files = await window.swat.vfs.list('/wordprocessor/docs');
      const docs = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const raw = await window.swat.vfs.read(`/wordprocessor/docs/${file}`);
          try {
            const metadata = JSON.parse(raw);
            // Backwards-compat: ensure metadata.path exists
            if (!metadata.path) {
              metadata.path = `/wordprocessor/docs/${file.replace(/\.json$/, '.html')}`;
            }
            docs.push(metadata);
          } catch (e) {
            console.warn('Failed to parse metadata for', file, e);
          }
        }
      }
      this.documents = docs;
      this.renderList();
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  }

  render() {
    this.innerHTML = `
      <h3>Documents</h3>
      <button class="btn" id="new-doc">New Document</button>
      <input type="file" id="import-file" accept=".html,.md" style="display: none;">
      <button class="btn" id="import-btn">Import</button>
      <input type="text" id="search" placeholder="Search documents..." style="width: 100%; margin: 0.5rem 0;">
      <ul id="doc-list"></ul>
    `;

    this.querySelector('#new-doc').addEventListener('click', () => {
      if (window.swat) window.swat.eventBus.emit('doc:new');
    });

    this.querySelector('#import-btn').addEventListener('click', () => {
      this.querySelector('#import-file').click();
    });

    this.querySelector('#import-file').addEventListener('change', (e) => {
      this.handleImport(e.target.files[0]);
    });

    this.querySelector('#search').addEventListener('input', (e) => {
      this.filterDocuments(e.target.value);
    });
  }

  renderList() {
    const list = this.querySelector('#doc-list');
    list.innerHTML = '';

    this.documents.forEach(doc => {
      const li = document.createElement('li');
      // Render buttons first (left) and filename/title on the right so variable filenames align naturally
      li.innerHTML = `
        <div class="doc-actions">
          <button class="btn small" data-action="open" data-path="${doc.path}">Open</button>
          <button class="btn small" data-action="delete" data-path="${doc.path}">Delete</button>
        </div>
        <div class="doc-title-right" title="${escapeHtml(doc.title)}">${doc.title}</div>
      `;
      li.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const path = e.target.dataset.path;
        if (action === 'open') {
          if (window.swat) {
            console.log('DocumentsPanel: open', path);
            window.swat.eventBus.emit('doc:open', { path });
          }
        } else if (action === 'delete') {
          this.deleteDocument(path);
        }
      });
      list.appendChild(li);
    });
  }


  filterDocuments(query) {
    const filtered = this.documents.filter(doc =>
      doc.title.toLowerCase().includes(query.toLowerCase())
    );
    // Temporarily update list
    const list = this.querySelector('#doc-list');
    list.innerHTML = '';
    filtered.forEach(doc => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${doc.title}</span><button class="btn small" data-action="open" data-path="${doc.path}">Open</button>`;
      li.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'open' && window.swat) {
          window.swat.eventBus.emit('doc:open', { path: e.target.dataset.path });
        }
      });
      list.appendChild(li);
    });
  }

  async deleteDocument(path) {
    if (!window.swat) return;
    if (confirm('Delete this document?')) {
      try {
        console.log('Deleting files for', path);
        // delete HTML file if present
        try {
          await window.swat.vfs.delete(path);
        } catch (e) {
          console.warn('HTML delete may have failed or not exist:', e);
        }
        // delete metadata JSON
        const metaPath = path.replace(/\.html$/, '.json');
        try {
          await window.swat.vfs.delete(metaPath);
        } catch (e) {
          console.warn('Metadata delete may have failed or not exist:', e);
        }
        this.loadDocuments();
        console.log('Delete complete for', path);
      } catch (e) {
        console.error('Delete failed:', e);
      }
    }
  }

  async handleImport(file) {
    if (!file || !window.swat) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const ext = file.name.split('.').pop().toLowerCase();
      let html = content;
      if (ext === 'md') {
        const { markdownToHtml } = await import('../utils/md-html-serializer.js');
        html = markdownToHtml(content);
      }

      const path = `/wordprocessor/docs/${file.name.replace(/\.[^/.]+$/, '')}-${Date.now()}.html`;
      await window.swat.vfs.write(path, html);
      const metadata = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        format: ext,
        mtime: Date.now(),
        size: html.length
      };
      await window.swat.vfs.write(path.replace('.html', '.json'), JSON.stringify(metadata));
      window.swat.eventBus.emit('doc:open', { path });
    };
    reader.readAsText(file);
  }
}

export function registerDocumentsPanel(swat) {
  customElements.define('word-editor-documents-panel', DocumentsPanel);
  swat.registerComponent('documents-panel', DocumentsPanel);
}

// Small helper to escape HTML in titles when inserting into templates
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>\"']/g, function(tag) {
    const charsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return charsToReplace[tag] || tag;
  });
}