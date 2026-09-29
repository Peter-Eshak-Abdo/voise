/**
 * VoiceClear PWA - Offline-First IndexedDB Local Storage
 * 
 * Safely persists transcription history entirely on the client's device.
 * Zero external database calls ensures 100% privacy and zero hosting cost.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { HistoryItem } from '@/types';

interface VoiceClearDBSchema extends DBSchema {
  history: {
    key: string;
    value: HistoryItem;
    indexes: {
      'by-timestamp': number;
      'by-favorite': number;
    };
  };
}

const DB_NAME = 'voiceclear-db';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const LOCAL_STORAGE_FALLBACK_KEY = 'voiceclear_history_backup';

let dbPromise: Promise<IDBPDatabase<VoiceClearDBSchema>> | null = null;

function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

export async function getDb(): Promise<IDBPDatabase<VoiceClearDBSchema> | null> {
  if (!isIndexedDBSupported()) return null;

  if (!dbPromise) {
    dbPromise = openDB<VoiceClearDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          // Numeric 1 or 0 for indexing
          store.createIndex('by-favorite', 'isFavorite');
        }
      },
    }).catch((err) => {
      console.warn('[IndexedDB] Failed to open database, falling back to localStorage:', err);
      return null as unknown as IDBPDatabase<VoiceClearDBSchema>;
    });
  }

  return dbPromise;
}

// LocalStorage fallback helpers
function getFromLocalStorage(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(items: HistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('[LocalStorage] Save failed:', err);
  }
}

/**
 * Save a new voice note transcription to local device storage
 */
export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.put(STORE_NAME, item);
      return;
    }
  } catch (err) {
    console.warn('[IndexedDB put error]:', err);
  }

  // Fallback to localStorage
  const current = getFromLocalStorage().filter((x) => x.id !== item.id);
  current.unshift(item);
  saveToLocalStorage(current);
}

/**
 * Retrieve all saved history items ordered by newest first
 */
export async function getAllHistory(): Promise<HistoryItem[]> {
  try {
    const db = await getDb();
    if (db) {
      const all = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
      return all.reverse(); // Newest first
    }
  } catch (err) {
    console.warn('[IndexedDB getAll error]:', err);
  }

  const items = getFromLocalStorage();
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Delete a specific history item by ID
 */
export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.delete(STORE_NAME, id);
      return;
    }
  } catch (err) {
    console.warn('[IndexedDB delete error]:', err);
  }

  const items = getFromLocalStorage().filter((x) => x.id !== id);
  saveToLocalStorage(items);
}

/**
 * Clear all local transcription history
 */
export async function clearAllHistory(): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.clear(STORE_NAME);
      return;
    }
  } catch (err) {
    console.warn('[IndexedDB clear error]:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_FALLBACK_KEY);
  }
}

/**
 * Toggle favorite status of a history entry
 */
export async function toggleFavoriteItem(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (db) {
      const item = await db.get(STORE_NAME, id);
      if (item) {
        item.isFavorite = !item.isFavorite;
        await db.put(STORE_NAME, item);
        return !!item.isFavorite;
      }
    }
  } catch (err) {
    console.warn('[IndexedDB toggle favorite error]:', err);
  }

  const items = getFromLocalStorage();
  const target = items.find((x) => x.id === id);
  if (target) {
    target.isFavorite = !target.isFavorite;
    saveToLocalStorage(items);
    return !!target.isFavorite;
  }
  return false;
}
