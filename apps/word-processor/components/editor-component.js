// components/editor-component.js

import { execCommand } from '../utils/format-commands.js';

export class WordEditor extends HTMLElement {
  constructor() {
    super();
    this.editor = null;
    this.undoStack = [];
    this.redoStack = [];
    this.debouncedChange = this.debounce(this.emitChange.bind(this), 300);
  }

  connectedCallback() {
    this.innerHTML = `
      <div contenteditable="true" id="editor-${Date.now()}" role="textbox" aria-multiline="true" aria-label="Word processor editor">
        <p>Start typing...</p>
      </div>
    `;
    this.editor = this.querySelector('[contenteditable]');
    this.editor.addEventListener('input', this.debouncedChange);
    this.editor.addEventListener('keydown', this.handleKeydown.bind(this));

    // Emit ready
    if (window.swat) {
      window.swat.eventBus.emit('editor:ready', { editorRef: this });

      // Listen for formatting commands from toolbar
      window.swat.eventBus.on('editor:format', (payload) => {
        if (!payload) return;
        const { cmd, value } = payload;
        if (cmd) this.execCommand(cmd, value);
      });

      // Load document content when a doc is loaded
      window.swat.eventBus.on('doc:loaded', (payload) => {
        try {
          if (payload && payload.content) {
            this.setHTML(payload.content);
          }
        } catch (e) {
          console.error('Failed to load document into editor', e);
        }
      });
    }
  }

  getHTML() {
    return this.editor ? this.editor.innerHTML : '';
  }

  setHTML(html) {
    if (this.editor) {
      this.editor.innerHTML = html;
      this.emitChange();
    }
  }

  getPlainText() {
    return this.editor ? this.editor.textContent : '';
  }

  execCommand(cmd, value) {
    execCommand(this.editor, cmd, value);
    this.emitChange();
  }

  focus() {
    if (this.editor) {
      this.editor.focus();
    }
  }

  handleKeydown(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b': e.preventDefault(); this.execCommand('bold'); break;
        case 'i': e.preventDefault(); this.execCommand('italic'); break;
        case 'u': e.preventDefault(); this.execCommand('underline'); break;
        case 'z': e.preventDefault(); this.undo(); break;
        case 'y': e.preventDefault(); this.redo(); break;
      }
    }
  }

  undo() {
    if (this.undoStack.length > 0) {
      this.redoStack.push(this.getHTML());
      this.setHTML(this.undoStack.pop());
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      this.undoStack.push(this.getHTML());
      this.setHTML(this.redoStack.pop());
    }
  }

  emitChange() {
    if (window.swat) {
      const html = this.getHTML();
      const text = this.getPlainText();
      const wordCount = text.split(/\s+/).filter(w => w).length;
      window.swat.eventBus.emit('editor:change', { html, text, wordCount });
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

export function registerWordEditor(swat) {
  customElements.define('word-editor', WordEditor);
  swat.registerComponent('word-editor', WordEditor);
}