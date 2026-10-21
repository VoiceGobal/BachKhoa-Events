// Safe Web Storage helper with memory fallback
// Prevents DOMException / SecurityError crashes in sandboxed iframes and privacy-strict browsers

const memoryStorage = new Map<string, string>();
const memorySessionStorage = new Map<string, string>();

function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storage = window[type];
    if (!storage) return false;
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const localAvailable = isStorageAvailable('localStorage');
const sessionAvailable = isStorageAvailable('sessionStorage');

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (localAvailable && typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback to memory
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (localAvailable && typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Fallback to memory
    }
    memoryStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (localAvailable && typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Fallback to memory
    }
    memoryStorage.delete(key);
  },
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (sessionAvailable && typeof window !== 'undefined') {
        return window.sessionStorage.getItem(key);
      }
    } catch {
      // Fallback to memory
    }
    return memorySessionStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (sessionAvailable && typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // Fallback to memory
    }
    memorySessionStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (sessionAvailable && typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Fallback to memory
    }
    memorySessionStorage.delete(key);
  },
};
