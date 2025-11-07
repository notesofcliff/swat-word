// storage.js - StorageAdapter (localStorage-based)

export class StorageAdapter {
  constructor(opts = {}) {
    this.prefix = opts.prefix || 'swat:';
  }

  async get(key) {
    try {
      const val = localStorage.getItem(this.prefix + key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      return null;
    }
  }

  async set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      throw new Error('Storage set failed');
    }
  }

  async delete(key) {
    localStorage.removeItem(this.prefix + key);
  }

  async list(prefix = '') {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.prefix + prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }
}