// plugin-sandbox.js - Optional worker sandbox helper

// TODO: Implement full worker sandbox for plugin isolation
// Requirements:
// - Create a module worker (new Worker('worker.js', { type: 'module' }))
// - Worker script that can import plugin code and run install with RPC
// - RPC methods: storage.get/set, eventBus.emit/on, limited DOM access if needed
// - PostMessage for communication, handle messages in main thread
// - Security: no direct DOM access, no global scope pollution

export function createPluginSandbox(pluginUrl) {
  // Stub: for now, just load directly (no sandbox)
  return import(pluginUrl);
}