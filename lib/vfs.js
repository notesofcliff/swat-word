// vfs.js - Virtual Filesystem

import { StorageAdapter } from './storage.js';

export class VFS {
  constructor(storage, opts = {}) {
    this.storage = storage;
    this.state = { files: {}, cwd: '/', history: [] };
    this.loadState();
  }

  async loadState() {
    const saved = await this.storage.get('vfs_state');
    if (saved) {
      this.state = saved;
    }
  }

  async saveState() {
    await this.storage.set('vfs_state', this.state);
  }

  normalizePath(path) {
    if (!path.startsWith('/')) path = this.state.cwd + '/' + path;
    const parts = path.split('/').filter(p => p && p !== '.');
    const stack = [];
    for (const part of parts) {
      if (part === '..') {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return '/' + stack.join('/');
  }

  async read(path) {
    path = this.normalizePath(path);
    const file = this.state.files[path];
    if (!file || file.type !== 'text') throw new Error('ENOENT');
    return file.content;
  }

  async write(path, content) {
    path = this.normalizePath(path);
    this.state.files[path] = { type: 'text', content, mtime: Date.now() };
    await this.saveState();
  }

  async delete(path) {
    path = this.normalizePath(path);
    delete this.state.files[path];
    await this.saveState();
  }

  async list(dir = '/') {
    dir = this.normalizePath(dir);
    if (!dir.endsWith('/')) dir += '/';
    const files = Object.keys(this.state.files).filter(p => p.startsWith(dir) && !p.slice(dir.length).includes('/'));
    return files.map(p => p.slice(dir.length));
  }

  async stat(path) {
    path = this.normalizePath(path);
    const file = this.state.files[path];
    if (!file) throw new Error('ENOENT');
    return { size: file.content.length, mtime: file.mtime, type: file.type };
  }

  cwd() {
    return this.state.cwd;
  }

  chdir(path) {
    this.state.cwd = this.normalizePath(path);
    this.saveState();
  }

  historyPush(command) {
    this.state.history.push(command);
    if (this.state.history.length > 100) this.state.history.shift();
    this.saveState();
  }

  dump() {
    return this.state;
  }

  import(state) {
    this.state = { ...this.state, ...state };
    this.saveState();
  }
}