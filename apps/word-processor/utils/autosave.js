// utils/autosave.js

export class AutoSave {
  constructor(swat, debounceMs = 2000) {
    this.swat = swat;
    this.debounceMs = debounceMs;
    this.currentDoc = null;
    this.isDirty = false;
    this.saveTimeout = null;
  }

  start() {
    this.swat.eventBus.on('doc:loaded', (payload) => {
      this.currentDoc = payload.path;
      this.isDirty = false;
    });

    this.swat.eventBus.on('doc:saved', () => {
      this.isDirty = false;
    });

    this.swat.eventBus.on('editor:change', () => {
      this.isDirty = true;
      this.debouncedSave();
    });
  }

  debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      if (this.isDirty && this.currentDoc) {
        this.swat.eventBus.emit('doc:save', { path: this.currentDoc });
      }
    }, this.debounceMs);
  }

  stop() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    // Remove listeners if possible, but since eventBus doesn't have off, maybe not
  }
}

// To use: const autosave = new AutoSave(swat); autosave.start();