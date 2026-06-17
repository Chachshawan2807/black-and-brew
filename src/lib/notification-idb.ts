import {
  NOTIFICATION_STORAGE_KEY,
  type InventoryNotification,
} from '@/lib/notification-types';
import { mergeNotificationLists } from '@/lib/notification-sync';

export const NOTIFICATION_IDB_NAME = 'bb-notifications-v1';
export const NOTIFICATION_IDB_STORE = 'notifications';
export const NOTIFICATION_IDB_KEY = 'list';

function openNotificationDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTIFICATION_IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTIFICATION_IDB_STORE)) {
        db.createObjectStore(NOTIFICATION_IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGetList(db: IDBDatabase): Promise<InventoryNotification[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTIFICATION_IDB_STORE, 'readonly');
    const store = tx.objectStore(NOTIFICATION_IDB_STORE);
    const request = store.get(NOTIFICATION_IDB_KEY);
    request.onsuccess = () => {
      const value = request.result;
      resolve(Array.isArray(value) ? (value as InventoryNotification[]) : []);
    };
    request.onerror = () => reject(request.error);
  });
}

function idbSetList(db: IDBDatabase, list: InventoryNotification[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTIFICATION_IDB_STORE, 'readwrite');
    const store = tx.objectStore(NOTIFICATION_IDB_STORE);
    const request = store.put(list, NOTIFICATION_IDB_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadNotificationsFromIdb(): Promise<InventoryNotification[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await openNotificationDb();
    try {
      return await idbGetList(db);
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

export async function saveNotificationsToIdb(
  notifications: InventoryNotification[],
): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openNotificationDb();
    try {
      await idbSetList(db, notifications);
    } finally {
      db.close();
    }
  } catch {
    // ignore — e.g. private browsing
  }
}

/** Merge IDB + localStorage copies (SW may have written while app was backgrounded). */
export async function loadMergedStoredNotifications(): Promise<InventoryNotification[]> {
  if (typeof window === 'undefined') return [];

  let local: InventoryNotification[] = [];
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as InventoryNotification[];
      local = Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    local = [];
  }

  const idb = await loadNotificationsFromIdb();
  return mergeNotificationLists(local, idb);
}

export async function mirrorNotificationsToIdb(
  notifications: InventoryNotification[],
): Promise<void> {
  await saveNotificationsToIdb(notifications);
}
