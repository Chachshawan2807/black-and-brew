/** IndexedDB queue for offline inventory mutations (client + tests). */

import {
  createOfflineMutationId,
  mergeOfflineFieldMutation,
  OFFLINE_MUTATION_DB_NAME,
  OFFLINE_MUTATION_STORE_NAME,
  type OfflineMutation,
  type OfflineMutationInput,
} from '@/lib/offline-mutation-types';
import { isOfflineMutationOwnedByCurrentSession } from '@/lib/offline-auth-session';

const LIST_KEY = 'queue';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_MUTATION_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_MUTATION_STORE_NAME)) {
        db.createObjectStore(OFFLINE_MUTATION_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readQueue(db: IDBDatabase): Promise<OfflineMutation[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_MUTATION_STORE_NAME, 'readonly');
    const store = tx.objectStore(OFFLINE_MUTATION_STORE_NAME);
    const request = store.get(LIST_KEY);
    request.onsuccess = () => {
      const value = request.result;
      resolve(Array.isArray(value) ? (value as OfflineMutation[]) : []);
    };
    request.onerror = () => reject(request.error);
  });
}

async function writeQueue(db: IDBDatabase, queue: OfflineMutation[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_MUTATION_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OFFLINE_MUTATION_STORE_NAME);
    const request = store.put(queue, LIST_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function coalesceQueue(queue: OfflineMutation[], incoming: OfflineMutation): OfflineMutation[] {
  if (incoming.kind !== 'inventory_field') {
    return [...queue, incoming];
  }

  const index = queue.findIndex(
    (entry) =>
      entry.kind === 'inventory_field' &&
      entry.itemId === incoming.itemId &&
      entry.field === incoming.field,
  );

  if (index === -1) {
    return [...queue, incoming];
  }

  const existing = queue[index] as OfflineMutation;
  const next = [...queue];
  next[index] = mergeOfflineFieldMutation(
    existing as Parameters<typeof mergeOfflineFieldMutation>[0],
    incoming,
  );
  return next;
}

export async function listOfflineMutations(): Promise<OfflineMutation[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openDb();
  try {
    return await readQueue(db);
  } finally {
    db.close();
  }
}

export async function enqueueOfflineMutation(
  mutation: OfflineMutationInput & Partial<Pick<OfflineMutation, 'id' | 'createdAt'>>,
): Promise<OfflineMutation> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB unavailable');
  }

  const entry = {
    ...mutation,
    id: mutation.id ?? createOfflineMutationId(),
    createdAt: mutation.createdAt ?? Date.now(),
  } as OfflineMutation;

  const db = await openDb();
  try {
    const queue = await readQueue(db);
    const next = coalesceQueue(queue, entry);
    await writeQueue(db, next);
    return entry;
  } finally {
    db.close();
  }
}

export async function removeOfflineMutation(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  try {
    const queue = await readQueue(db);
    await writeQueue(
      db,
      queue.filter((entry) => entry.id !== id),
    );
  } finally {
    db.close();
  }
}

export async function peekOfflineMutation(): Promise<OfflineMutation | null> {
  const queue = await listOfflineMutations();
  return queue[0] ?? null;
}

export async function clearOfflineMutationQueue(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  try {
    await writeQueue(db, []);
  } finally {
    db.close();
  }
}

export async function purgeUnownedOfflineMutations(
  currentAuthSessionId: string,
): Promise<number> {
  if (!currentAuthSessionId || typeof indexedDB === 'undefined') return 0;
  const db = await openDb();
  try {
    const queue = await readQueue(db);
    const owned = queue.filter((entry) =>
      isOfflineMutationOwnedByCurrentSession(entry, currentAuthSessionId),
    );
    const removed = queue.length - owned.length;
    if (removed > 0) {
      await writeQueue(db, owned);
    }
    return removed;
  } finally {
    db.close();
  }
}
