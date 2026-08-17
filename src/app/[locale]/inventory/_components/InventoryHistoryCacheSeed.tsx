'use client';

import { useRef } from 'react';
import { seedInventoryHistoryCacheIfEmpty } from '@/lib/inventory-history-prefetch';
import type { TransactionHistoryRow } from './InventoryHistoryModal';

type Props = {
  initialTransactionHistory: TransactionHistoryRow[];
  initialHistoryHasMore: boolean;
};

/** Seeds module-level history cache as soon as the inventory route hydrates (before lazy InventoryClient). */
export function InventoryHistoryCacheSeed({
  initialTransactionHistory,
  initialHistoryHasMore,
}: Props) {
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seedInventoryHistoryCacheIfEmpty(
      { type: 'ALL', searchQuery: '' },
      {
        data: initialTransactionHistory,
        hasMore: initialHistoryHasMore,
      },
    );
    seededRef.current = true;
  }
  return null;
}
