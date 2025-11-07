// swat.js - Core SWAT runtime

import { StorageAdapter } from './storage.js';
import { VFS } from './vfs.js';
import { createEventBus } from './stdlib.js';

export class SWAT {
  constructor(opts = {}) {
    this.version = '0.0.1';
    this.config = opts.config || {};
    this.storage = opts.storage || new StorageAdapter(opts.storageOpts);
    this.vfs = new VFS(this.storage);
    this.eventBus = createEventBus();
    this.components = new Map();
    this.plugins = new Map();
    this.apps = new Map();
  }

  async boot({ id, root = '#root', entry, title }) {
    document.title = title || 'SWAT App';
    const appModule = await import(entry);
    const app = appModule.default || appModule;
    if (typeof app === 'function') {
      await app(this);
    }
    this.apps.set(id, app);
  }

  // Components
  registerComponent(name, factory) {
    this.components.set(name, factory);
  }

  getComponent(name) {
    return this.components.get(name);
  }

  // Plugins
  async loadPluginFromUrl(url) {
    const mod = await import(url);
    return this.loadPluginFromModule(mod, url);
  }

  async loadPluginFromModule(mod, id) {
    if (mod.install) {
      await mod.install(this);
      this.plugins.set(id, mod);
    }
  }

  async unloadPlugin(id) {
    const plugin = this.plugins.get(id);
    if (plugin && plugin.uninstall) {
      await plugin.uninstall(this);
    }
    this.plugins.delete(id);
  }

  // Storage RPC for sandbox
  async rpcStorageGet(key) {
    return this.storage.get(key);
  }

  async rpcStorageSet(key, val) {
    return this.storage.set(key, val);
  }

  // Convenience
  log(level, ...args) {
    const msg = `[${level.toUpperCase()}] ${args.join(' ')}`;
    console.log(msg);
    this.eventBus.emit('log', { level, message: msg });
  }
}

export function boot(opts) {
  return (new SWAT(opts)).boot(opts);
}