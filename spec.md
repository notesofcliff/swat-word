# Word Processor — Implementation spec (uses SWAT)

### Assumptions about SWAT (available and used)

Use these SWAT primitives everywhere — do not reimplement:

* `swat.registerComponent(name, factory)` and `swat.getComponent(name)` for UI widgets.
* `swat.eventBus` for in-app events (`on/emit`).
* `swat.storage` (StorageAdapter) and `swat.vfs` (VFS) for persistence.
* `swat.registerPlugin()` / plugin install contract for plugin extensions.
* `stdlib` helpers (`el()`, `downloadBlob()`, `csvParse()` if needed).
* `swat-ui.css` for base styling and layout.

Where SWAT lacks a feature we need (e.g., contenteditable helpers, Markdown serialization) we will add small app-level utilities.

---

## 1 — Project layout (inside `apps/word-processor/`)

```
apps/word-processor/
├── index.html              # boots SWAT and app entry
├── main.js                 # app bootstrap: default export (swat) => mount UI, register components
├── style.css               # app-level styles (imports swat-ui.css)
├── components/
│   ├── editor-component.js         # registers 'word-editor' component
│   ├── toolbar-component.js        # registers 'editor-toolbar' component
│   ├── documents-panel.js          # file browser using swat.vfs
│   └── statusbar-component.js      # shows word count, save state, etc.
├── utils/
│   ├── format-commands.js          # implementations for bold/italic/align/clear-format
│   ├── md-html-serializer.js       # import/export markdown <-> HTML utilities
│   └── autosave.js                 # optional autosave helper
├── plugins/                         # project-specific plugins (optional)
└── tests/
    └── run.html                     # app tests integrated to swat tests framework
```

---

## 2 — Top-level app bootstrap (`main.js`)

* Default export `async function(swat) {}` (matches SWAT boot contract).
* Responsibilities:

  * Register the app’s components with `swat.registerComponent(...)`.
  * Instantiate VFS-backed docs store (use `swat.vfs` or create a small wrapper around `swat.vfs` for namespacing under `/wordprocessor/`).
  * Wire event bus channels for editor actions and document lifecycle.
  * Optionally load/announce installed plugins (call `swat.loadPluginFromVfs()` if you allow plugin discovery via VFS).

Events to use (all on `swat.eventBus`):

* `editor:ready` — editor instance is ready (payload: { editorRef })
* `editor:format` — formatting command (payload: { cmd: 'bold'|'italic'|..., value? })
* `doc:open` — request to open document (payload: { path })
* `doc:save` — request to save (payload: { path, format: 'html'|'md' })
* `doc:saved` — after save completes (payload: { path, mtime })
* `doc:list` — request document list
* `doc:import` / `doc:export` — import/export operations
* `plugin:action` — plugin communicated actions

Design rule: components **emit** actions/events rather than calling each other directly.

---

## 3 — Components & responsibilities

### 3.1 `word-editor` (core, contenteditable)

* Registered via `swat.registerComponent('word-editor', factory)`.
* Factory returns an HTMLElement with:

  * A `contenteditable` div with unique id and accessible attributes (`role="textbox"`, `aria-multiline="true"`).
  * Public methods attached to the element:

    * `.getHTML()` → string
    * `.setHTML(htmlString)` → void
    * `.getPlainText()` → string
    * `.execCommand(cmd, value?)` → applies formatting using `document.execCommand` fallback OR DOM Range based mutations for higher reliability. (Implement as small app util in `format-commands.js`.)
    * `.focus()` → focus inside editor
  * Emits local events or uses `swat.eventBus.emit('editor:ready', { editorRef: el })` on mount.
* Behavior:

  * Maintains undo stack (use `document.execCommand('undo')` where available; otherwise keep a simple history snapshot array).
  * Listens for `editor:format` events and applies via `.execCommand()`.
  * On input, emit `editor:change` (debounced) with `{ html, text, wordCount }`.

Notes:

* Prefer DOM Range/Selection operations for alignment and precise formatting rather than naive HTML fiddling. If necessary, provide two fallbacks: simple `execCommand` first, and a Range-based helper for more control.

### 3.2 `editor-toolbar`

* Registered as `swat.registerComponent('editor-toolbar', factory)`.
* Renders buttons: Bold, Italic, Underline, Align Left/Center/Right, Heading dropdown, Insert Link, Undo, Redo, Save, Export (HTML/MD).
* When clicked, dispatch `swat.eventBus.emit('editor:format', { cmd: 'bold' })` or `swat.eventBus.emit('doc:save', { format: 'html' })`.
* Toolbar also shows document name and a quick save indicator (dirty/clean).
* Use SWAT UI buttons (`.btn`) and icons (inline SVG or CSS).

### 3.3 `documents-panel`

* Uses `swat.vfs.list('/wordprocessor/')` to show saved docs.
* Features:

  * New document button (creates `/wordprocessor/untitled-1.html`).
  * Click to open (`swat.eventBus.emit('doc:open', { path })`).
  * Rename/delete actions call `swat.vfs.write`, `swat.vfs.delete`, `swat.vfs.rename` (rename utility at app-level if VFS lacks it).
  * Search/filter by name.
  * Import button to upload HTML/MD; on import, write to VFS and emit `doc:open`.

### 3.4 `statusbar-component`

* Displays word count (from `editor:change` events), current path, save status (saving / saved / error), auto-save status.
* Shows current plugin hints if a plugin registers UI slots.

---

## 4 — Storage & VFS usage

Use SWAT VFS for all documents. Namespacing:

* Store documents under `/wordprocessor/docs/<slug>.html` or `.md`.
* Store metadata under `/wordprocessor/metadata/<slug>.json` (title, created_at, modified_at, format).

Document model:

```json
{
  "path": "/wordprocessor/docs/notes-2025-11-07.html",
  "title": "Notes Nov 7",
  "format": "html",           // or 'md'
  "mtime": 1699420000000,
  "size": 12345
}
```

APIs (app-level wrappers):

* `saveDocument(path, { html, md, title, format })` → uses `swat.vfs.write(path, content)` and writes metadata file.
* `loadDocument(path)` → returns `{ html, md, metadata }`.
* `listDocuments()` → returns array of metadata by enumerating `/wordprocessor/docs/` and reading metadata.
* `exportDocument(path, format)` → returns blob/string for user to download.

Autosave:

* Implement as optional `autosave.js` util that subscribes to `editor:change` and calls `saveDocument` after debounce (2s) if doc is dirty.

Versioning:

* For simple undo beyond runtime, optionally write checkpoint files (`/wordprocessor/history/<slug>/<timestamp>.html`) per major save.

---

## 5 — Import & Export (HTML and Markdown)

* HTML import: user pastes or uploads `.html` — sanitize minimal (strip `<script>` and event attributes) or rely on safe environment. Save raw HTML to VFS.
* Markdown:

  * Implement `md-html-serializer.js` in `utils/`. Use a tiny in-app converter (no external libs). Options:

    * Basic conversion features: headings (`#`), bold (`**`), italic (`*`), lists (`-`), links (`[text](url)`), inline code/backticks.
    * Export: convert editor HTML → markdown by mapping tags (`<h1>`→`# `, `<strong>`→`**`).
  * Keep serializer simple and well-tested. Because you said no third-party deps, implement only what you need (basic set).

Export UI:

* "Export → HTML" downloads saved HTML file (use `downloadBlob()` from SWAT stdlib or implement simple `a` download).
* "Export → Markdown" uses serializer convert and downloads `.md`.

---

## 6 — Plugin support (use SWAT plugin system)

* Define plugin hooks (app-level, documented) — plugins are SWAT plugins that call `install(swat)` with these expectations:

  * They can register toolbar buttons via `swat.getComponent('editor-toolbar')` or via `swat.registerComponent` to provide a UI piece the toolbar consumes.
  * Subscribe to events: `swat.eventBus.on('doc:open', ...)` to modify content on open, or `swat.eventBus.on('editor:change', ...)` for linting/analysis.
  * Use `swat.vfs` to persist plugin data under `/wordprocessor/plugins/<plugin-id>/`.
* Provide a `plugin manifest` pattern (small JSON `plugin-meta.json`) plugins should include in their root to be installable via swatctl.

Example plugin capabilities:

* Spell-check plugin: listens to `editor:change`, provides diagnostics, shows underlines via overlay or comments.
* Export plugin: registers new export formats (e.g., PDF) via `swat.eventBus.on('doc:export-request', ...)`.

Security: plugins run as part of the runtime; document that untrusted plugins may run JS — if needed support sandboxing via SWAT's `plugin-sandbox` (worker) — but this is optional.

---

## 7 — Accessibility & mobile/responsive concerns

* Editor:

  * `contenteditable` must have `aria-label`, `aria-multiline="true"`.
  * Toolbar buttons must be `button` elements with `aria-pressed` toggles where appropriate and keyboard shortcuts.
  * Provide keyboard shortcuts for formatting: `Ctrl/Cmd+B`, `Ctrl/Cmd+I`, `Ctrl/Cmd+U`, etc.
* Layout:

  * Use SWAT `.container`, `.card`, `.row`, `.col` to create a fluid layout.
  * On small screens, hide the documents panel behind a drawer / toggle.
* Screen readers:

  * Provide a read-only HTML export view (non-editable) with semantic tags for screen readers.

---

## 8 — Tests (what to include in `tests/run.html`)

Add app tests to SWAT test harness. Minimal set:

* **Unit tests**

  * `format-commands.js` formatting functions: apply bold/italic to selection snapshots.
  * `md-html-serializer.js` convert round-trip: markdown → html → markdown (or html → markdown → html) for a small set of cases.
  * VFS integration: save → list → load ensures content matches.
  * Autosave: simulate `editor:change` events and ensure `saveDocument` is called (mock `swat.vfs`).

* **Integration tests**

  * Mount `word-editor` component, set HTML, call `getPlainText()`, verify word count.
  * Simulate toolbar click events (emit `editor:format`) and assert editor content changes.
  * Save+Reload: save doc to VFS, clear editor, emit `doc:open` and assert content restored.

* **Manual QA checklist**

  * Keyboard formatting shortcuts work in supported browsers.
  * Import/Export of basic markdown files.
  * Drag/drop or file upload import works (if implemented).
  * Autosave doesn't interrupt typing (debounced).

Tests should be runnable inside `tests/run.html` using the same pattern SWAT uses for other demos.

---

## 9 — UX notes & simple flows

### New document

1. User clicks “New” (documents-panel emits `doc:new`).
2. App creates `/wordprocessor/docs/untitled-N.html` with basic template HTML and metadata; emits `doc:open`.

### Save

1. User clicks Save or autosave triggers.
2. App reads editor HTML: `editorRef.getHTML()`.
3. Writes to VFS path and updates metadata.
4. Emit `doc:saved` with path + mtime.

### Open

1. User selects document from documents panel → emit `doc:open`.
2. App loads document via `loadDocument(path)` and `editorRef.setHTML(html)`; update status bar with title/mtime.

### Import

1. User uploads file (HTML or MD).
2. Convert if needed via `md-html-serializer`, save to `/wordprocessor/docs/<slug>`, then `doc:open`.

---

## 10 — Small app-level utilities to implement (only when SWAT lacks them)

* `format-commands.js` — small wrapper around `document.execCommand` and/or Range operations to execute formatting commands consistently across browsers.
* `slugify(title)` — small helper to turn doc titles into safe filenames.
* `md-html-serializer.js` — basic markdown ↔ html mapping.
* `vfs-helpers.js` (if SWAT VFS lacks rename/stat): rename and stat utilities.

Keep these tiny and well-tested.

---

## 11 — Versioning & migration

* Keep a small `app-version` in `apps/word-processor/app.json`. If you change the internal storage format (metadata shape), implement a migration handler that runs on app boot:

  * `if (metadata.version < APP_VERSION) run migrations ...` using `swat.storage` to update `/wordprocessor/metadata/*` format.

---

## 12 — Minimal security considerations

* Sanitize imported HTML (strip `<script>` and `on*` attributes). Provide explicit warning if importing unsanitized HTML.
* Plugins: document they run with app privileges; recommend plugin authors persist data under plugin namespace.

---

## 13 — Deliverables checklist (what you should build next)

* [ ] `main.js` boot: register components and wire event bus.
* [ ] `editor-component.js` with public API methods and event wiring.
* [ ] `toolbar-component.js` wired to `editor:format` and `doc:save`.
* [ ] `documents-panel.js` with VFS operations.
* [ ] `utils/md-html-serializer.js` (basic)
* [ ] Tests: unit tests for serializer and formatting; integration tests for save/load.
* [ ] README user docs (keyboard shortcuts, plugin docs)
* [ ] Optional: autosave and history/versioning.

---

## 14 — How to hand this to Copilot/human dev with minimal context

Use this exact prompt structure (example):

> I have SWAT runtime with `swat.registerComponent`, `swat.eventBus`, `swat.vfs`, and `swat.storage`. Build a Word Processor app that mounts as `apps/word-processor/`. Implement components `word-editor`, `editor-toolbar`, `documents-panel`, and `statusbar-component`. Use `swat.vfs` for document persistence under `/wordprocessor/docs/`. Provide these public editor methods: `getHTML`, `setHTML`, `getPlainText`, `execCommand`. Implement a small `md-html-serializer` that supports headings, bold, italic, lists, links. Add tests that run in SWAT test harness for save/load, formatting commands, and serializer round-trip. Keep zero-build, vanilla JS, no external deps.
