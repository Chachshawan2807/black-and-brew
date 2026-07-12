/** Client bridge for inventory table Web Worker with main-thread fallback. */

import {
  filterInventoryQuickSearchInWorker,
  processInventoryGridView,
  shouldUseInventoryTableWorker,
} from '@/lib/inventory-table-ops';
import type {
  InventoryTableWorkerRequest,
  InventoryTableWorkerResponse,
} from '@/workers/inventory-table.worker';

let worker: Worker | null = null;
let requestSeq = 0;
const pending = new Map<
  number,
  { resolve: (items: unknown[]) => void; reject: (error: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (worker) return worker;

  try {
    worker = new Worker(new URL('../workers/inventory-table.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<InventoryTableWorkerResponse>) => {
      const data = event.data;
      const handler = pending.get(data.id);
      if (!handler) return;
      pending.delete(data.id);
      if (data.ok) handler.resolve(data.items);
      else handler.reject(new Error(data.error));
    };
    worker.onerror = () => {
      for (const [, handler] of pending) {
        handler.reject(new Error('Inventory table worker failed'));
      }
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

function runWorkerRequest<T>(payload: InventoryTableWorkerRequest): Promise<T[]> {
  const activeWorker = getWorker();
  if (!activeWorker) {
    return Promise.reject(new Error('Worker unavailable'));
  }

  const id = ++requestSeq;
  return new Promise<T[]>((resolve, reject) => {
    pending.set(id, {
      resolve: (items) => resolve(items as T[]),
      reject,
    });
    activeWorker.postMessage({ ...payload, id });
  });
}

export async function processInventoryGridViewAsync<
  T extends { id: string; name: string; sort_order?: number },
>(items: T[], query: string): Promise<T[]> {
  if (!shouldUseInventoryTableWorker(items.length)) {
    return processInventoryGridView(items, query);
  }

  try {
    return await runWorkerRequest<T>({
      id: 0,
      type: 'grid_view',
      items,
      query,
    });
  } catch {
    return processInventoryGridView(items, query);
  }
}

export async function filterInventoryQuickSearchAsync<
  T extends { id: string; name: string },
>(items: T[], query: string, limit = 10, excludeIds: Iterable<string> = []): Promise<T[]> {
  const excludeList = [...excludeIds];
  if (!shouldUseInventoryTableWorker(items.length)) {
    return filterInventoryQuickSearchInWorker(items, query, limit, excludeList);
  }

  try {
    return await runWorkerRequest<T>({
      id: 0,
      type: 'quick_search',
      items,
      query,
      limit,
      excludeIds: excludeList,
    });
  } catch {
    return filterInventoryQuickSearchInWorker(items, query, limit, excludeList);
  }
}

export { shouldUseInventoryTableWorker };
