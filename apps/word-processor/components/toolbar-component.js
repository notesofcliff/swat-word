// components/toolbar-component.js

export class EditorToolbar extends HTMLElement {
  constructor() {
    super();
    this.currentDoc = null;
    this.saveStatus = 'clean';
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="toolbar-group">
        <button class="btn" data-cmd="bold" title="Bold (Ctrl+B)">B</button>
        <button class="btn" data-cmd="italic" title="Italic (Ctrl+I)">I</button>
        <button class="btn" data-cmd="underline" title="Underline (Ctrl+U)">U</button>
      </div>
      <div class="toolbar-group">
        <button class="btn" data-cmd="justifyLeft" title="Align Left">⬅</button>
        <button class="btn" data-cmd="justifyCenter" title="Align Center">⬌</button>
        <button class="btn" data-cmd="justifyRight" title="Align Right">➡</button>
      </div>
      <div class="toolbar-group">
        <select data-cmd="formatBlock">
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>
      <div class="toolbar-group">
        <button class="btn" data-cmd="insertUnorderedList" title="Bullet List">•</button>
        <button class="btn" data-cmd="insertOrderedList" title="Numbered List">1.</button>
      </div>
      <div class="toolbar-group">
        <button class="btn" data-cmd="undo" title="Undo (Ctrl+Z)">↶</button>
        <button class="btn" data-cmd="redo" title="Redo (Ctrl+Y)">↷</button>
      </div>
      <div class="toolbar-group">
        <button class="btn" id="docs-toggle" title="Toggle Documents">☰ Docs</button>
        <button class="btn" id="save-btn" title="Save">💾 Save</button>
        <button class="btn" id="export-html" title="Export HTML">📄 HTML</button>
        <button class="btn" id="export-md" title="Export Markdown">📝 MD</button>
      </div>
      <div class="toolbar-group">
        <span id="doc-name-container">
          <span id="doc-name" tabindex="0">Untitled</span>
          <input id="doc-name-input" class="hidden" type="text" aria-label="Document title">
        </span>
        <span id="save-indicator">●</span>
      </div>
    `;

    this.addEventListener('click', this.handleClick.bind(this));
    this.querySelector('select').addEventListener('change', this.handleSelect.bind(this));

    // Listen for events
    if (window.swat) {
      window.swat.eventBus.on('doc:loaded', (payload) => {
        this.currentDoc = payload.path;
        const title = payload.metadata && payload.metadata.title ? payload.metadata.title : 'Untitled';
        this.updateDocName(title);
      });
      window.swat.eventBus.on('doc:saved', () => {
        this.setSaveStatus('saved');
        setTimeout(() => this.setSaveStatus('clean'), 2000);
      });
      window.swat.eventBus.on('editor:change', () => {
        this.setSaveStatus('dirty');
      });
    }
        // Setup editable name handlers
        this.connectedCallbackNameEditable();
  }

  handleClick(e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const cmd = btn.dataset.cmd;
    if (cmd) {
      e.preventDefault();
      if (window.swat) {
        window.swat.eventBus.emit('editor:format', { cmd });
      }
    } else if (btn.id === 'save-btn') {
      if (window.swat) {
        if (this.currentDoc) {
          // include the current title when saving
          window.swat.eventBus.emit('doc:save', { path: this.currentDoc, title: this.docTitle });
        } else {
          // No current doc yet (unsaved). Create a new path and save to it.
          const slug = 'untitled-' + Date.now();
          const path = `/wordprocessor/docs/${slug}.html`;
          this.currentDoc = path;
          this.updateDocName('Untitled');
          window.swat.eventBus.emit('doc:save', { path, title: this.docTitle || 'Untitled' });
          // Also write metadata after save will be emitted by main
        }
      }
    } else if (btn.id === 'docs-toggle') {
      if (window.swat) window.swat.eventBus.emit('docs:toggle');
    } else if (btn.id === 'export-html') {
      this.export('html');
    } else if (btn.id === 'export-md') {
      this.export('md');
    }
  }

  handleSelect(e) {
    const cmd = e.target.dataset.cmd;
    const value = e.target.value;
    if (cmd && window.swat) {
      window.swat.eventBus.emit('editor:format', { cmd, value });
    }
  }

  updateDocName(name) {
    this.docTitle = name || 'Untitled';
    const span = this.querySelector('#doc-name');
    const input = this.querySelector('#doc-name-input');
    if (span) span.textContent = this.docTitle;
    if (input) input.value = this.docTitle;
  }

  connectedCallbackNameEditable() {
    const span = this.querySelector('#doc-name');
    const input = this.querySelector('#doc-name-input');
    if (!span || !input) return;

    // When user clicks the title, switch to input
    span.addEventListener('click', () => {
      span.classList.add('hidden');
      input.classList.remove('hidden');
      input.focus();
      input.select();
    });

    // On blur or Enter, save the new title
    const commit = () => {
      const val = input.value.trim() || 'Untitled';
      this.updateDocName(val);
      input.classList.add('hidden');
      span.classList.remove('hidden');
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = this.docTitle || 'Untitled';
        input.blur();
      }
    });
  }

  setSaveStatus(status) {
    this.saveStatus = status;
    const indicator = this.querySelector('#save-indicator');
    if (indicator) {
      indicator.textContent = status === 'dirty' ? '●' : '○';
      indicator.style.color = status === 'dirty' ? 'red' : 'green';
    }
  }

  async export(format) {
    // Allow export even when document hasn't been saved yet by falling back to editor content
    if (!window.swat) return;

    let html = null;
    let filename = 'untitled.html';
    try {
      if (this.currentDoc) {
        // Try reading from VFS first
        try {
          html = await window.swat.vfs.read(this.currentDoc);
          filename = this.currentDoc.split('/').pop();
        } catch (e) {
          // ignore and fall back to editor
          console.warn('VFS read failed for export, falling back to editor content', e);
        }
      }

      if (!html) {
        // Read directly from the editor DOM
        const editorEl = document.querySelector('word-editor');
        if (editorEl && typeof editorEl.getHTML === 'function') {
          html = editorEl.getHTML();
        } else {
          throw new Error('No editor content available to export');
        }
      }

      let content, mime;
      if (format === 'html') {
        content = html;
        mime = 'text/html';
        if (!filename.endsWith('.html')) filename = filename.replace(/\.[^/.]+$/, '') + '.html';
      } else {
        const { htmlToMarkdown } = await import('../utils/md-html-serializer.js');
        content = htmlToMarkdown(html);
        mime = 'text/markdown';
        if (this.currentDoc) {
          filename = this.currentDoc.split('/').pop().replace('.html', '.md');
        } else {
          filename = 'untitled.md';
        }
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      // Append to DOM to support Firefox click behavior
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed: ' + (e.message || e));
    }
  }
}

export function registerEditorToolbar(swat) {
  customElements.define('word-editor-toolbar', EditorToolbar);
  swat.registerComponent('editor-toolbar', EditorToolbar);
}