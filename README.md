# Word Processor

A primitive word processor built with the SWAT framework. This application provides basic text editing capabilities with a clean, web-based interface.

## Features

- **Text Editing**: Rich text editor with contenteditable support for real-time editing.
- **Formatting Options**: Bold, italic, underline, and text alignment controls.
- **Document Management**: Save and load documents using the virtual filesystem, with support for HTML and Markdown import/export.
- **Toolbar**: Intuitive toolbar with formatting buttons and menu options.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.
- **Plugin Support**: Extensible architecture for adding custom features via SWAT plugins.

## Usage

1. Open `index.html` in your browser.
2. Start typing in the editable area.
3. Use the toolbar to apply formatting.
4. Save your document to the virtual filesystem.

## Keyboard Shortcuts

- **Ctrl+B / Cmd+B**: Bold
- **Ctrl+I / Cmd+I**: Italic
- **Ctrl+U / Cmd+U**: Underline
- **Ctrl+Z / Cmd+Z**: Undo
- **Ctrl+Y / Cmd+Y**: Redo

## Document Management

- **New Document**: Click "New Document" in the documents panel.
- **Open Document**: Click on a document in the list.
- **Save**: Click "Save" in the toolbar or wait for autosave.
- **Import**: Click "Import" to upload HTML or Markdown files.
- **Export**: Use "HTML" or "MD" buttons to download the current document.

## Plugins

The word processor supports SWAT plugins for extensibility. Plugins can:

- Add new toolbar buttons or formatting options.
- Provide analysis or linting (e.g., spell check).
- Extend export formats (e.g., PDF).
- Integrate with external services.

To install a plugin, place it in the `plugins/` directory and load it via SWAT's plugin system.

## Architecture

Built using SWAT's modular components:
- Event bus for inter-component communication
- Storage adapter for document persistence
- UI utilities for DOM manipulation
- Plugin system for extensibility

This project demonstrates the power of zero-build, vanilla JavaScript web applications.
