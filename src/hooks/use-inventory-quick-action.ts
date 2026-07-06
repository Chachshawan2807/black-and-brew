'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  recordBulkInventoryTransactions,
  recordTransaction,
  updateInventoryStock,
} from '@/app/actions/inventory-actions';
import { getClientSessionId } from '@/lib/client-session';
import type { InventoryNotificationSource } from '@/lib/inventory-notification-filter';
import { filterInventoryQuickSearchItems } from '@/lib/inventory-quick-search-filter';
import { getQuickBadgeStyles } from '@/lib/inventory-stock';
import { READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';
import {
  addBulkQueueItem,
  buildBulkQueueFromPaste,
  canSubmitBulkQueue,
  computeBulkPreview,
  removeBulkQueueItem,
  resolveBulkSubmitPayload,
  setBulkLineQty,
  toBulkQueueItem,
  parseBulkEntry,
  findItemByFuzzyName,
  type BulkQueueItem,
  type BulkQuickType,
  type BulkStockItem,
} from '@/lib/inventory-quick-bulk';
import {
  clearInventoryQuickActionDraft,
  getDefaultInventoryQuickActionDraft,
  hydrateBulkQueueFromItems,
  loadInventoryQuickActionDraft,
  saveInventoryQuickActionDraft,
  type InventoryQuickActionDraft,
  type QuickActionDraftType,
} from '@/lib/inventory-quick-action-draft';

type QuickType = QuickActionDraftType;

type UseInventoryQuickActionOptions<T extends BulkStockItem> = {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  isReadOnly: boolean;
  showHistoryModal?: boolean;
  onHistoryRefresh?: () => void | Promise<void>;
  onAfterSave?: () => void;
  onBeforeSave?: () => void;
  onSaveError?: () => void;
  isItemsLoaded?: boolean;
  /** Tags audit logs so only this UI origin triggers notifications. */
  notificationSource: InventoryNotificationSource;
};

function readInitialDraft(): InventoryQuickActionDraft {
  if (typeof localStorage === 'undefined') {
    return getDefaultInventoryQuickActionDraft();
  }
  return loadInventoryQuickActionDraft() ?? getDefaultInventoryQuickActionDraft();
}

export function useInventoryQuickAction<T extends BulkStockItem>({
  items,
  setItems,
  isReadOnly,
  showHistoryModal = false,
  onHistoryRefresh,
  onAfterSave,
  onBeforeSave,
  onSaveError,
  isItemsLoaded = true,
  notificationSource,
}: UseInventoryQuickActionOptions<T>) {
  const initialDraft = useMemo(() => readInitialDraft(), []);

  const [quickSearch, setQuickSearch] = useState(initialDraft.quickSearch);
  const [quickQty, setQuickQty] = useState(initialDraft.quickQty);
  const [quickType, setQuickType] = useState<QuickType>(initialDraft.quickType);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isQuickPending, setIsQuickPending] = useState(false);
  const [bulkMode, setBulkMode] = useState(initialDraft.bulkMode);
  const [bulkQueue, setBulkQueue] = useState<BulkQueueItem[]>(initialDraft.bulkQueue);

  const bulkQuickType: BulkQuickType = quickType === 'OUT' ? 'OUT' : 'IN';

  const setQuickTypeSafe = useCallback((type: QuickType) => {
    setQuickType(type);
  }, []);

  const resetQuickEntryFields = useCallback(() => {
    setQuickSearch('');
    setQuickQty('');
    setIsSearchFocused(false);
  }, []);

  const setBulkModeSafe = useCallback((next: boolean) => {
    setBulkMode(next);
    if (next) {
      setQuickType((prev) => (prev === 'OUT' ? 'OUT' : 'IN'));
      resetQuickEntryFields();
    } else {
      setBulkQueue([]);
      resetQuickEntryFields();
    }
  }, [resetQuickEntryFields]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate bulk queue when inventory items load
    setBulkQueue((prev) => {
      if (prev.length === 0) return prev;
      if (!isItemsLoaded || items.length === 0) return prev;
      const hydrated = hydrateBulkQueueFromItems(prev, items);
      return JSON.stringify(prev) === JSON.stringify(hydrated) ? prev : hydrated;
    });
  }, [items, isItemsLoaded]);

  useEffect(() => {
    saveInventoryQuickActionDraft({
      bulkMode,
      bulkQueue,
      quickSearch,
      quickQty,
      quickType,
    });
  }, [bulkMode, bulkQueue, quickSearch, quickQty, quickType]);

  const filteredItems = useMemo(() => {
    const excludeIds = bulkMode ? bulkQueue.map((line) => line.itemId) : [];
    return filterInventoryQuickSearchItems(items, quickSearch, 10, excludeIds);
  }, [items, quickSearch, bulkMode, bulkQueue]);

  const selectedQuickItem = useMemo(
    () => items.find((item) => item.name === quickSearch || item.id === quickSearch),
    [items, quickSearch],
  );

  const quickBadgeStyles = useMemo(() => {
    if (!selectedQuickItem) return getQuickBadgeStyles(0, 0);
    return getQuickBadgeStyles(
      Number(selectedQuickItem.stock) || 0,
      Number((selectedQuickItem as BulkStockItem & { order_point?: number }).order_point) || 0,
    );
  }, [selectedQuickItem]);

  const bulkPreviews = useMemo(
    () => bulkQueue.map((line) => ({ line, preview: computeBulkPreview(line, bulkQuickType) })),
    [bulkQueue, bulkQuickType],
  );

  const bulkSubmitReady = useMemo(
    () => canSubmitBulkQueue(bulkQueue, bulkQuickType),
    [bulkQueue, bulkQuickType],
  );

  const selectBulkQuickItem = useCallback(
    (item: { id: string }) => {
      const full = items.find((row) => row.id === item.id);
      if (!full) return;
      const result = addBulkQueueItem(bulkQueue, full);
      setBulkQueue(result.queue);
    },
    [items, bulkQueue],
  );

  const addBulkItemFromSearch = useCallback(() => {
    const { name, qty } = parseBulkEntry(quickSearch);
    let item = items.find((row) => row.id === name);
    if (!item) {
      item = findItemByFuzzyName(items, name);
    }
    
    if (!item) {
      alert(`ไม่พบสินค้าที่ระบุค่ะ (${name})`);
      return;
    }
    const result = addBulkQueueItem(bulkQueue, item);
    let newQueue = result.queue;
    newQueue = setBulkLineQty(newQueue, item.id, qty);
    
    setBulkQueue(newQueue);
    setQuickSearch('');
    setIsSearchFocused(true);
  }, [items, quickSearch, bulkQueue]);

  const handleBulkPaste = useCallback(
    (text: string) => {
      const { queue, unknownNames } = buildBulkQueueFromPaste(text, items, bulkQueue);
      setBulkQueue(queue);
      if (unknownNames.length > 0) {
        alert(`ไม่พบในระบบ: ${unknownNames.join(', ')}`);
      }
    },
    [items, bulkQueue],
  );

  const refreshHistoryIfOpen = useCallback(async () => {
    if (!showHistoryModal || !onHistoryRefresh) return;
    await onHistoryRefresh();
  }, [showHistoryModal, onHistoryRefresh]);

  const handleQuickSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isReadOnly) {
        alert(READ_ONLY_DENY_MSG);
        return;
      }
      if (isQuickPending) return;

      if (bulkMode) {
        if (!bulkSubmitReady) return;

        void (async () => {
          try {
            setIsQuickPending(true);
            onBeforeSave?.();
            const payload = resolveBulkSubmitPayload(bulkQueue, bulkQuickType);
            const res = await recordBulkInventoryTransactions(payload, 'Quick Entry - Bulk', {
              clientSessionId: getClientSessionId(),
              notificationSource,
            });

            const succeeded = res.results.filter((row) => row.success);
            const failed = res.results.filter((row) => !row.success);

            if (succeeded.length > 0) {
              setItems((prev) =>
                prev.map((item) => {
                  const hit = succeeded.find((row) => row.itemId === item.id);
                  return hit?.newStock !== undefined ? { ...item, stock: hit.newStock } : item;
                }),
              );
            }

            if (failed.length > 0) {
              onSaveError?.();
              const failedIds = new Set(failed.map((row) => row.itemId));
              setBulkQueue((prev) => prev.filter((line) => failedIds.has(line.itemId)));
              resetQuickEntryFields();
              alert(
                `บันทึกสำเร็จ ${succeeded.length}/${res.results.length} — ${failed
                  .map((row) => {
                    const name = items.find((item) => item.id === row.itemId)?.name ?? row.itemId;
                    return `${name}: ${row.error ?? 'ล้มเหลว'}`;
                  })
                  .join('; ')}`,
              );
            } else {
              setBulkQueue([]);
              resetQuickEntryFields();
              clearInventoryQuickActionDraft();
              onAfterSave?.();
            }

            await refreshHistoryIfOpen();
          } finally {
            setIsQuickPending(false);
          }
        })();
        return;
      }

      if (!quickSearch || !quickQty) return;

      const item = items.find((row) => row.name === quickSearch || row.id === quickSearch);
      if (!item) {
        alert('ไม่พบสินค้าที่ระบุค่ะ');
        return;
      }

      const qty = Number(quickQty);
      if (quickType === 'ADJUST') {
        if (Number.isNaN(qty) || qty < 0) {
          alert('กรุณาระบุจำนวนคงเหลือที่ถูกต้องค่ะ');
          return;
        }
      } else if (Number.isNaN(qty) || qty <= 0) {
        alert('กรุณาระบุจำนวนที่ถูกต้องค่ะ');
        return;
      }

      void (async () => {
        try {
          setIsQuickPending(true);
          onBeforeSave?.();
          const res =
            quickType === 'ADJUST'
              ? await updateInventoryStock(item.id, qty, 'Quick Entry - Adjust', {
                  clientSessionId: getClientSessionId(),
                  notificationSource,
                })
              : await recordTransaction(item.id, quickType, qty, 'Quick Entry', {
                  clientSessionId: getClientSessionId(),
                  notificationSource,
                });

          if (!res.success) {
            onSaveError?.();
            alert(res.error);
            return;
          }

          setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, stock: res.newStock! } : row)));
          resetQuickEntryFields();
          clearInventoryQuickActionDraft();
          onAfterSave?.();
          await refreshHistoryIfOpen();
        } finally {
          setIsQuickPending(false);
        }
      })();
    },
    [
      isReadOnly,
      isQuickPending,
      bulkMode,
      bulkSubmitReady,
      bulkQueue,
      bulkQuickType,
      quickSearch,
      quickQty,
      items,
      quickType,
      setItems,
      onBeforeSave,
      onAfterSave,
      onSaveError,
      refreshHistoryIfOpen,
      notificationSource,
      resetQuickEntryFields,
    ],
  );

  return {
    quickSearch,
    setQuickSearch,
    quickQty,
    setQuickQty,
    quickType,
    setQuickType: setQuickTypeSafe,
    isSearchFocused,
    setIsSearchFocused,
    isQuickPending,
    filteredItems,
    selectedQuickItem,
    quickBadgeStyles,
    bulkMode,
    setBulkMode: setBulkModeSafe,
    bulkQueue,
    bulkPreviews,
    bulkSubmitReady,
    bulkQuickType,
    addBulkItemById: selectBulkQuickItem,
    selectBulkQuickItem,
    addBulkItemFromSearch,
    handleBulkPaste,
    removeBulkItem: (itemId: string) => setBulkQueue((prev) => removeBulkQueueItem(prev, itemId)),
    clearBulkQueue: () => {
      setBulkQueue([]);
      clearInventoryQuickActionDraft();
    },
    setBulkLineQty: (itemId: string, qty: string) =>
      setBulkQueue((prev) => setBulkLineQty(prev, itemId, qty)),
    syncBulkLineStock: (itemId: string) => {
      const item = items.find((row) => row.id === itemId);
      if (!item) return;
      setBulkQueue((prev) =>
        prev.map((line) =>
          line.itemId === itemId
            ? { ...line, currentStock: Number(item.stock) || 0 }
            : line,
        ),
      );
    },
    toBulkQueueItem,
    handleQuickSubmit,
  };
}
