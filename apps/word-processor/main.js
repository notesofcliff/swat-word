// main.js - App bootstrap for Word Processor

import { registerWordEditor } from './components/editor-component.js';
import { registerEditorToolbar } from './components/toolbar-component.js';
import { registerDocumentsPanel } from './components/documents-panel.js';
import { registerStatusbarComponent } from './components/statusbar-component.js';

export default async function(swat) {
  // Register components
  registerWordEditor(swat);
  registerEditorToolbar(swat);
  registerDocumentsPanel(swat);
  registerStatusbarComponent(swat);

  // Set up event bus listeners for document lifecycle
  swat.eventBus.on('doc:open', async (payload) => {
    const { path } = payload;
    // Load document and emit to editor
    try {
      const content = await swat.vfs.read(path);
      const metadata = await swat.vfs.read(path.replace(/\.html$/, '.json'));
      swat.eventBus.emit('doc:loaded', { path, content, metadata: JSON.parse(metadata) });
    } catch (e) {
      swat.log('error', 'Failed to open document:', e);
    }
  });

  swat.eventBus.on('doc:save', async (payload) => {
    const { path, format = 'html' } = payload;
    // Get content from editor and save
    // Find the editor element in the DOM (component instances are DOM elements)
    const editorEl = document.querySelector('word-editor');
    if (editorEl && typeof editorEl.getHTML === 'function') {
      const html = editorEl.getHTML();
      // Prefer title passed in payload (from toolbar editable field), otherwise ask editor
      const title = payload && payload.title ? payload.title : (editorEl.getTitle ? editorEl.getTitle() : 'Untitled');
      await swat.vfs.write(path, html);
      const metadata = {
        path,
        title,
        format,
        mtime: Date.now(),
        size: html.length
      };
      await swat.vfs.write(path.replace(/\.html$/, '.json'), JSON.stringify(metadata));
      swat.eventBus.emit('doc:saved', { path, mtime: metadata.mtime });
    } else {
      swat.log('warn', 'No editor instance found to save');
    }
  });

  swat.eventBus.on('doc:new', async () => {
    // Create new untitled document
    const path = `/wordprocessor/docs/untitled-${Date.now()}.html`;
    await swat.vfs.write(path, '<p>Start typing...</p>');
    const metadata = {
      path,
      title: 'Untitled',
      format: 'html',
      mtime: Date.now(),
      size: 18
    };
    await swat.vfs.write(path.replace(/\.html$/, '.json'), JSON.stringify(metadata));
    swat.eventBus.emit('doc:open', { path });
  });

  // Mount UI
  const root = document.getElementById('root');
  root.className = 'word-processor';

  const layout = document.createElement('div');
  layout.className = 'editor-layout';

  // Documents panel
  const docsPanel = document.createElement('word-editor-documents-panel');
  docsPanel.className = 'documents-panel';
  layout.appendChild(docsPanel);

  const main = document.createElement('div');
  main.className = 'editor-main';

  // Toolbar
  const toolbar = document.createElement('word-editor-toolbar');
  toolbar.className = 'editor-toolbar';
  main.appendChild(toolbar);

  // Editor
  const editor = document.createElement('word-editor');
  editor.className = 'editor-content';
  main.appendChild(editor);

  // Status bar
  const statusbar = document.createElement('word-editor-statusbar');
  statusbar.className = 'status-bar';
  main.appendChild(statusbar);

  layout.appendChild(main);
  root.appendChild(layout);

  // Emit ready
  swat.eventBus.emit('app:ready');
}