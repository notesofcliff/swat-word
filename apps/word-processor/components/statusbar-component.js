// components/statusbar-component.js

export class StatusbarComponent extends HTMLElement {
  constructor() {
    super();
    this.wordCount = 0;
    this.currentPath = 'Untitled';
    this.saveStatus = 'clean';
    this.autoSaveStatus = 'off';
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="status-left">
        <span id="word-count">Words: 0</span>
        <span id="char-count">Chars: 0</span>
      </div>
      <div class="status-center">
        <span id="current-doc">${this.currentPath}</span>
      </div>
      <div class="status-right">
        <span id="save-status">${this.saveStatus}</span>
        <span id="autosave-status">${this.autoSaveStatus}</span>
      </div>
    `;

    // Listen for events
    if (window.swat) {
      window.swat.eventBus.on('editor:change', (payload) => {
        this.updateWordCount(payload.wordCount, payload.text.length);
      });
      window.swat.eventBus.on('doc:loaded', (payload) => {
        this.currentPath = payload.path;
        this.updateCurrentDoc(payload.metadata.title);
      });
      window.swat.eventBus.on('doc:saved', (payload) => {
        this.saveStatus = 'saved';
        this.updateSaveStatus();
        setTimeout(() => {
          this.saveStatus = 'clean';
          this.updateSaveStatus();
        }, 2000);
      });
      window.swat.eventBus.on('editor:change', () => {
        this.saveStatus = 'dirty';
        this.updateSaveStatus();
      });
    }
  }

  updateWordCount(words, chars) {
    this.wordCount = words;
    this.querySelector('#word-count').textContent = `Words: ${words}`;
    this.querySelector('#char-count').textContent = `Chars: ${chars}`;
  }

  updateCurrentDoc(title) {
    this.querySelector('#current-doc').textContent = title;
  }

  updateSaveStatus() {
    const statusEl = this.querySelector('#save-status');
    statusEl.textContent = this.saveStatus;
    statusEl.className = this.saveStatus;
  }
}

export function registerStatusbarComponent(swat) {
  customElements.define('word-editor-statusbar', StatusbarComponent);
  swat.registerComponent('statusbar-component', StatusbarComponent);
}