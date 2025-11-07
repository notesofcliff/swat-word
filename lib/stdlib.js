// stdlib.js - JS helpers

export function createEventBus() {
  const listeners = {};
  return {
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    emit(ev, payload) { (listeners[ev] || []).forEach(fn => fn(payload)); },
    off(ev, fn) {
      if (listeners[ev]) {
        const idx = listeners[ev].indexOf(fn);
        if (idx !== -1) listeners[ev].splice(idx, 1);
      }
    }
  };
}

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') e.appendChild(document.createTextNode(child));
    else e.appendChild(child);
  }
  return e;
}

export async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, json: res.ok ? JSON.parse(text) : null, error: null };
  } catch (e) {
    return { ok: false, status: 0, text: '', json: null, error: e.message };
  }
}

export function csvParse(text) {
  // Minimal CSV parser (no quotes handling)
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map(line => line.split(',').map(cell => cell.trim()));
}

export function csvStringify(rows) {
  return rows.map(row => row.join(',')).join('\n');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}