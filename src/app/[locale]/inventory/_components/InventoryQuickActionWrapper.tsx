'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  prefetchInventoryHistoryFirstPage,
  warmInventoryHistoryFilterPages,
} from '@/lib/inventory-history-prefetch';

const InventoryQuickActionFAB = dynamic(() => import('./InventoryQuickActionFAB'), {
  ssr: false,
});

export default function InventoryQuickActionWrapper() {
  useEffect(() => {
    void prefetchInventoryHistoryFirstPage();
    warmInventoryHistoryFilterPages();
  }, []);

  return <InventoryQuickActionFAB />;
}
