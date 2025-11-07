// utils.js - Small shared utilities

// Minimal implementations; possible improvements: add more robust error handling, edge cases

export function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  };
}

export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

export function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

export function authStub() {
  // Stub: store token in localStorage
  return {
    login: (token) => localStorage.setItem('auth_token', token),
    logout: () => localStorage.removeItem('auth_token'),
    getToken: () => localStorage.getItem('auth_token'),
    isLoggedIn: () => !!localStorage.getItem('auth_token')
  };
}

// Stub for i18n
export const i18n = {
  t: (key) => key // placeholder
};