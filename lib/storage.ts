import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

/**
 * Cross-platform storage wrapper
 * Uses Capacitor Preferences on native platforms and localStorage on web
 * Provides a consistent API across all platforms
 */

/**
 * Set a value in storage
 * @param key The key to store the value under
 * @param value The value to store (will be JSON stringified)
 */
export async function setItem(key: string, value: any): Promise<void> {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

  if (isNative()) {
    await Preferences.set({ key, value: stringValue });
  } else {
    localStorage.setItem(key, stringValue);
  }
}

/**
 * Get a value from storage
 * @param key The key to retrieve
 * @returns The stored value, or null if not found
 */
export async function getItem(key: string): Promise<string | null> {
  if (isNative()) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
}

/**
 * Get a value from storage and parse it as JSON
 * @param key The key to retrieve
 * @returns The parsed value, or null if not found
 */
export async function getItemJSON<T = any>(key: string): Promise<T | null> {
  const value = await getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing JSON from storage:', error);
    return null;
  }
}

/**
 * Remove a value from storage
 * @param key The key to remove
 */
export async function removeItem(key: string): Promise<void> {
  if (isNative()) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Clear all values from storage
 */
export async function clear(): Promise<void> {
  if (isNative()) {
    await Preferences.clear();
  } else {
    localStorage.clear();
  }
}

/**
 * Get all keys from storage
 * @returns An array of all keys
 */
export async function keys(): Promise<string[]> {
  if (isNative()) {
    const { keys } = await Preferences.keys();
    return keys;
  } else {
    return Object.keys(localStorage);
  }
}

/**
 * Migrate existing localStorage data to Capacitor Preferences
 * Call this once when the app first runs on a native platform
 */
export async function migrateFromLocalStorage(): Promise<void> {
  if (!isNative()) {
    console.warn('migrateFromLocalStorage should only be called on native platforms');
    return;
  }

  // Get all localStorage keys and values
  const localStorageKeys = Object.keys(localStorage);

  for (const key of localStorageKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      await Preferences.set({ key, value });
    }
  }

  console.log(`Migrated ${localStorageKeys.length} items from localStorage to Preferences`);
}

/**
 * Synchronous storage operations (web-only, for backward compatibility)
 * These will throw an error on native platforms
 */
export const syncStorage = {
  setItem(key: string, value: any): void {
    if (isNative()) {
      throw new Error('Synchronous storage operations are not available on native platforms. Use the async methods instead.');
    }
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  },

  getItem(key: string): string | null {
    if (isNative()) {
      throw new Error('Synchronous storage operations are not available on native platforms. Use the async methods instead.');
    }
    return localStorage.getItem(key);
  },

  removeItem(key: string): void {
    if (isNative()) {
      throw new Error('Synchronous storage operations are not available on native platforms. Use the async methods instead.');
    }
    localStorage.removeItem(key);
  },

  clear(): void {
    if (isNative()) {
      throw new Error('Synchronous storage operations are not available on native platforms. Use the async methods instead.');
    }
    localStorage.clear();
  },
};
