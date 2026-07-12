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
  const [visibleItems, setVisibleItems] = useState<T[]>(syncItems);
  const [isWorkerFiltering, setIsWorkerFiltering] = useState(false);

  useEffect(() => {
    if (!shouldUseInventoryTableWorker(items.length)) {
      setVisibleItems(syncItems);
      setIsWorkerFiltering(false);
      return;
    }

    let cancelled = false;
    setIsWorkerFiltering(true);

    void processInventoryGridViewAsync(items, query).then((next) => {
      if (cancelled) return;
      setVisibleItems(next);
      setIsWorkerFiltering(false);
    });

    return () => {
      cancelled = true;
    };
  }, [items, query, syncItems]);

  return {
    visibleItems: shouldUseInventoryTableWorker(items.length) ? visibleItems : syncItems,
    isWorkerFiltering,
  };
}
