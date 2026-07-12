/// <reference lib="webworker" />

import {
  filterInventoryQuickSearchInWorker,
  processInventoryGridView,
} from '@/lib/inventory-table-ops';

export type InventoryTableWorkerRequest =
  | {
      id: number;
      type: 'grid_view';
      items: Array<{ id: string; name: string; sort_order?: number }>;
      query: string;
    }
  | {
      id: number;
      type: 'quick_search';
      items: Array<{ id: string; name: string }>;
      query: string;
      limit?: number;
      excludeIds?: string[];
    };

export type InventoryTableWorkerResponse =
  | { id: number; ok: true; items: unknown[] }
  | { id: number; ok: false; error: string };

self.onmessage = (event: MessageEvent<InventoryTableWorkerRequest>) => {
  const payload = event.data;
  try {
    if (payload.type === 'grid_view') {
      const items = processInventoryGridView(payload.items, payload.query);
      const response: InventoryTableWorkerResponse = { id: payload.id, ok: true, items };
      self.postMessage(response);
      return;
    }

    const items = filterInventoryQuickSearchInWorker(
      payload.items,
      payload.query,
      payload.limit,
      payload.excludeIds,
    );
    const response: InventoryTableWorkerResponse = { id: payload.id, ok: true, items };
    self.postMessage(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const response: InventoryTableWorkerResponse = {
      id: payload.id,
      ok: false,
      error: message,
    };
    self.postMessage(response);
  }
};
