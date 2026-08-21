'use client';

import { useRef } from 'react';
import {
  seedInventoryHistoryCacheIfEmpty,
  type HistoryCacheKeyInput,
} from '@/lib/inventory-history-prefetch';
import type { InventoryTransactionFilterType } from '@/lib/inventory-history-query';
import type { TransactionHistoryRow } from './InventoryHistoryModal';

export type InventoryHistorySeedPage = {
  type: InventoryTransactionFilterType;
  rows: TransactionHistoryRow[];
  hasMore: boolean;
};

type Props = {
  initialTransactionHistory: TransactionHistoryRow[];
  initialHistoryHasMore: boolean;
  initialFilterPages?: InventoryHistorySeedPage[];
};

function seedPage(input: HistoryCacheKeyInput, rows: TransactionHistoryRow[], hasMore: boolean) {
  seedInventoryHistoryCacheIfEmpty(input, { data: rows, hasMore });
}

/** Seeds module-level history cache as soon as the inventory route hydrates (before lazy InventoryClient). */
export function InventoryHistoryCacheSeed({
  initialTransactionHistory,
  initialHistoryHasMore,
  initialFilterPages = [],
}: Props) {
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seedPage({ type: 'ALL', searchQuery: '' }, initialTransactionHistory, initialHistoryHasMore);
    for (const page of initialFilterPages) {
      seedPage({ type: page.type, searchQuery: '' }, page.rows, page.hasMore);
    }
    seededRef.current = true;
  }
  return null;
}
