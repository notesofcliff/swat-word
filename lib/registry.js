// registry.js - Command Registry

export class CommandRegistry {
  constructor() {
    this.commands = new Map();
  }

  register(name, fn) {
    this.commands.set(name, fn);
  }

  get(name) {
    return this.commands.get(name);
  }

  list() {
    return Array.from(this.commands.keys());
  }
}