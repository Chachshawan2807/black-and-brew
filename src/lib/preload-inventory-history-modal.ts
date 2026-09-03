import { createPreloadOnce } from '@/lib/create-preload-once';
import {
  prefetchInventoryHistoryFirstPage,
  warmInventoryHistoryFilterPages,
} from '@/lib/inventory-history-prefetch';

const { preload: preloadInventoryHistoryModal, resetForTests: resetInventoryHistoryModalPreloadForTests } =
  createPreloadOnce(() => {
    void import('@/app/[locale]/inventory/_components/InventoryHistoryModal');
    prefetchInventoryHistoryFirstPage();
    warmInventoryHistoryFilterPages();
  });

/** Warm the inventory history modal chunk and first-page data before the user opens it. */
export { preloadInventoryHistoryModal };

/** @internal Vitest only */
export { resetInventoryHistoryModalPreloadForTests };
