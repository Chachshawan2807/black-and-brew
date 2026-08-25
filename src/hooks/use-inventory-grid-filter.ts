'use client';

import { useEffect, useMemo, useState } from 'react';
import { processInventoryGridView } from '@/lib/inventory-table-ops';
import {
  processInventoryGridViewAsync,
  shouldUseInventoryTableWorker,
} from '@/lib/inventory-table-worker-client';

/** Keeps inventory grid filtering off the main thread for large lists. */
export function useInventoryGridFilter<T extends { id: string; name: string; sort_order?: number }>(
  items: T[],
  query: string,
) {
  const syncItems = useMemo(() => processInventoryGridView(items, query), [items, query]);
  const useWorker = shouldUseInventoryTableWorker(items.length);
  const workerKey = useMemo(() => `${items.length}\0${query}`, [items.length, query]);
  const [workerVisibleItems, setWorkerVisibleItems] = useState<T[]>(syncItems);
  const [resolvedWorkerKey, setResolvedWorkerKey] = useState(workerKey);

  useEffect(() => {
    if (!useWorker) return;

    let cancelled = false;

    void processInventoryGridViewAsync(items, query).then((next) => {
      if (cancelled) return;
      setWorkerVisibleItems(next);
      setResolvedWorkerKey(workerKey);
    });

    return () => {
      cancelled = true;
    };
  }, [items, query, useWorker, workerKey]);

  return {
    visibleItems: useWorker ? workerVisibleItems : syncItems,
    isWorkerFiltering: useWorker && resolvedWorkerKey !== workerKey,
  };
}
