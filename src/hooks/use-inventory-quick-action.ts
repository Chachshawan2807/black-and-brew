'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchInventoryInOutActivitySnapshot,
  recordBulkInventoryTransactions,
  recordTransaction,
  updateInventoryStock,
} from '@/app/actions/inventory-actions';
import { getClientSessionId } from '@/lib/client-session';
import type { InventoryNotificationSource } from '@/lib/inventory-notification-filter';
import { filterInventoryQuickSearchItems } from '@/lib/inventory-quick-search-filter';
import { filterInventoryQuickSearchAsync, shouldUseInventoryTableWorker } from '@/lib/inventory-table-worker-client';
import { getQuickBadgeStyles } from '@/lib/inventory-stock';
import {
  bangkokDateStringToTransactionAt,
  getBangkokTodayDateString,
  getBangkokYesterdayDateString,
  getDefaultTransactionDateString,
  getGapDismissStorageKey,
  isValidTransactionDateString,
  shouldPromptTransactionDate,
} from '@/lib/inventory-transaction-date';
import { READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';
import {
  addBulkQueueItem,
  canSubmitBulkQueue,
  computeBulkPreview,
  computeOptimisticStockAfterTransaction,
  removeBulkQueueItem,
  resolveBulkSubmitPayload,
  resolveInOutQuantity,
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

type PendingSingleSubmit<T extends BulkStockItem> = {
  kind: 'single';
  item: T;
  qty: number;
  quickType: 'IN' | 'OUT';
  previousStock: number;
  optimisticStock: number;
};

type PendingBulkSubmit = { kind: 'bulk' };

type PendingTransactionSubmit<T extends BulkStockItem> =
  | PendingSingleSubmit<T>
  | PendingBulkSubmit;

type UseInventoryQuickActionOptions<T extends BulkStockItem> = {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  isReadOnly: boolean;
  showHistoryModal?: boolean;
  onHistoryRefresh?: () => void | Promise<void>;
  onAfterSave?: (saved?: { id: string; name: string }) => void;
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
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [backfillMode, setBackfillMode] = useState(false);
  const [transactionDateModalOpen, setTransactionDateModalOpen] = useState(false);
  const [transactionDate, setTransactionDate] = useState('');
  const [transactionDateReason, setTransactionDateReason] = useState<'backfill' | 'gap'>('backfill');
  const [pendingSubmit, setPendingSubmit] = useState<PendingTransactionSubmit<T> | null>(null);
  const [hasYesterdayInOutGap, setHasYesterdayInOutGap] = useState(false);
  const [yesterdayDate, setYesterdayDate] = useState('');
  const [todayDate, setTodayDate] = useState('');
  const backgroundSyncRef = useRef(false);

  const bulkQuickType: BulkQuickType =
    quickType === 'OUT' ? 'OUT' : quickType === 'ADJUST' ? 'ADJUST' : 'IN';

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
    setBulkConfirmOpen(false);
    if (next) {
      setQuickType((prev) => (prev === 'OUT' ? 'OUT' : 'IN'));
      resetQuickEntryFields();
    } else {
      setBulkQueue([]);
      resetQuickEntryFields();
    }
  }, [resetQuickEntryFields]);

  useEffect(() => {
    queueMicrotask(() => {
      setBulkQueue((prev) => {
        if (prev.length === 0) return prev;
        if (!isItemsLoaded || items.length === 0) return prev;
        const hydrated = hydrateBulkQueueFromItems(prev, items);
        return JSON.stringify(prev) === JSON.stringify(hydrated) ? prev : hydrated;
      });
    });
  }, [items, isItemsLoaded]);

  useEffect(() => {
    void fetchInventoryInOutActivitySnapshot().then((res) => {
      if (!res.success || !res.data) return;
      setTodayDate(res.data.todayDate);
      setYesterdayDate(res.data.yesterdayDate);
      if (!res.data.yesterdayHasInOut) {
        setHasYesterdayInOutGap(true);
      }
    });
  }, []);

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
    if (shouldUseInventoryTableWorker(items.length)) {
      return [];
    }
    return filterInventoryQuickSearchItems(items, quickSearch, 10, excludeIds);
  }, [items, quickSearch, bulkMode, bulkQueue]);

  const useWorkerFilter = shouldUseInventoryTableWorker(items.length);
  const [workerFilteredItems, setWorkerFilteredItems] = useState<typeof filteredItems>([]);

  useEffect(() => {
    if (!useWorkerFilter) return;

    const excludeIds = bulkMode ? bulkQueue.map((line) => line.itemId) : [];
    let cancelled = false;

    void filterInventoryQuickSearchAsync(items, quickSearch, 10, excludeIds).then((next) => {
      if (!cancelled) setWorkerFilteredItems(next);
    });

    return () => {
      cancelled = true;
    };
  }, [items, quickSearch, bulkMode, bulkQueue, useWorkerFilter]);

  const resolvedFilteredItems = useWorkerFilter ? workerFilteredItems : filteredItems;

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
    const explicitQty = quickSearch.includes('=');
    const lineQty =
      quickType === 'ADJUST' && !explicitQty ? '' : qty;
    newQueue = setBulkLineQty(newQueue, item.id, lineQty);
    
    setBulkQueue(newQueue);
    setQuickSearch('');
    setIsSearchFocused(true);
  }, [items, quickSearch, bulkQueue, quickType]);

  const refreshHistoryIfOpen = useCallback(() => {
    if (!showHistoryModal || !onHistoryRefresh) return;
    void onHistoryRefresh();
  }, [showHistoryModal, onHistoryRefresh]);

  const openTransactionDatePrompt = useCallback(
    (pending: PendingTransactionSubmit<T>) => {
      const today = todayDate || getBangkokTodayDateString();
      const yesterday = yesterdayDate || getBangkokYesterdayDateString();
      setTransactionDate(
        getDefaultTransactionDateString({
          backfillMode,
          hasYesterdayInOutGap,
          today,
          yesterday,
        }),
      );
      setTransactionDateReason(backfillMode ? 'backfill' : 'gap');
      setPendingSubmit(pending);
      setTransactionDateModalOpen(true);
    },
    [backfillMode, hasYesterdayInOutGap, todayDate, yesterdayDate],
  );

  const executeBulkSubmit = useCallback(async (transactionAt?: string) => {
    const queueSnapshot = bulkQueue;
    const payload = resolveBulkSubmitPayload(queueSnapshot, bulkQuickType);
    const optimisticUpdates = bulkPreviews
      .map(({ line, preview }) =>
        preview.error === undefined
          ? { itemId: line.itemId, previousStock: preview.before, nextStock: preview.after }
          : null,
      )
      .filter((row): row is { itemId: string; previousStock: number; nextStock: number } => row !== null);
    const savedItem = items.find((item) => item.id === optimisticUpdates[0]?.itemId);

    try {
      setIsQuickPending(true);
      onBeforeSave?.();

      if (optimisticUpdates.length > 0) {
        setItems((prev) =>
          prev.map((item) => {
            const hit = optimisticUpdates.find((row) => row.itemId === item.id);
            return hit ? { ...item, stock: hit.nextStock } : item;
          }),
        );
      }

      setBulkQueue([]);
      resetQuickEntryFields();
      clearInventoryQuickActionDraft();
      onAfterSave?.(savedItem ? { id: savedItem.id, name: savedItem.name } : undefined);
      setIsQuickPending(false);

      const bulkNote =
        bulkQuickType === 'ADJUST' ? 'Quick Entry - Bulk Adjust' : 'Quick Entry - Bulk';

      let succeeded: Array<{ itemId: string; newStock?: number }> = [];
      let failed: Array<{ itemId: string; error?: string }> = [];

      if (bulkQuickType === 'ADJUST') {
        const results = await Promise.all(
          payload.map(async (entry) => {
            const result = await updateInventoryStock(entry.itemId, entry.quantity, bulkNote, {
              clientSessionId: getClientSessionId(),
              notificationSource,
            });
            return {
              itemId: entry.itemId,
              success: result.success,
              newStock: result.newStock,
              error: result.error,
            };
          }),
        );
        succeeded = results.filter((row) => row.success);
        failed = results.filter((row) => !row.success);
      } else {
        const res = await recordBulkInventoryTransactions(
          payload.map((entry) => ({
            itemId: entry.itemId,
            type: bulkQuickType,
            quantity: entry.quantity,
          })),
          bulkNote,
          {
            clientSessionId: getClientSessionId(),
            notificationSource,
            transactionAt,
          },
        );
        succeeded = res.results.filter((row) => row.success);
        failed = res.results.filter((row) => !row.success);
      }

      const resultCount = succeeded.length + failed.length;

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
        setItems((prev) =>
          prev.map((item) => {
            const rollback = optimisticUpdates.find((row) => row.itemId === item.id);
            return rollback && failedIds.has(item.id)
              ? { ...item, stock: rollback.previousStock }
              : item;
          }),
        );
        const restoredQueue = queueSnapshot.filter((line) => failedIds.has(line.itemId));
        if (restoredQueue.length > 0) {
          setBulkQueue(restoredQueue);
        }
        alert(
          `บันทึกสำเร็จ ${succeeded.length}/${resultCount} ${failed
            .map((row) => {
              const name = items.find((item) => item.id === row.itemId)?.name ?? row.itemId;
              return `${name}: ${row.error ?? 'ล้มเหลว'}`;
            })
            .join('; ')}`,
        );
      }

      refreshHistoryIfOpen();
    } finally {
      setIsQuickPending(false);
    }
  }, [
    bulkQueue,
    bulkQuickType,
    bulkPreviews,
    items,
    notificationSource,
    onAfterSave,
    onBeforeSave,
    onSaveError,
    refreshHistoryIfOpen,
    resetQuickEntryFields,
    setItems,
  ]);

  const executeSingleSubmit = useCallback(
    async (pending: PendingSingleSubmit<T>, transactionAt?: string) => {
      const { item, qty, quickType: txType, previousStock, optimisticStock } = pending;

      backgroundSyncRef.current = true;
      setIsQuickPending(true);
      onBeforeSave?.();

      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, stock: optimisticStock } : row)),
      );
      resetQuickEntryFields();
      clearInventoryQuickActionDraft();
      onAfterSave?.({ id: item.id, name: item.name });
      setIsQuickPending(false);

      void (async () => {
        try {
          const res = await recordTransaction(item.id, txType, qty, 'Quick Entry', {
            clientSessionId: getClientSessionId(),
            notificationSource,
            transactionAt,
          });

          if (!res.success) {
            setItems((prev) =>
              prev.map((row) => (row.id === item.id ? { ...row, stock: previousStock } : row)),
            );
            onSaveError?.();
            alert(res.error);
            return;
          }

          if (res.newStock != null && res.newStock !== optimisticStock) {
            setItems((prev) =>
              prev.map((row) => (row.id === item.id ? { ...row, stock: res.newStock! } : row)),
            );
          }

          refreshHistoryIfOpen();
        } finally {
          backgroundSyncRef.current = false;
        }
      })();
    },
    [
      notificationSource,
      onAfterSave,
      onBeforeSave,
      onSaveError,
      refreshHistoryIfOpen,
      resetQuickEntryFields,
      setItems,
    ],
  );

  const confirmBulkSubmit = useCallback(() => {
    if (isReadOnly) {
      alert(READ_ONLY_DENY_MSG);
      return;
    }
    if (isQuickPending || !bulkSubmitReady) return;
    setBulkConfirmOpen(false);
    if (
      shouldPromptTransactionDate({
        backfillMode,
        hasYesterdayInOutGap,
        quickType: bulkQuickType,
      })
    ) {
      openTransactionDatePrompt({ kind: 'bulk' });
      return;
    }
    void executeBulkSubmit();
  }, [
    bulkSubmitReady,
    executeBulkSubmit,
    isQuickPending,
    isReadOnly,
    backfillMode,
    hasYesterdayInOutGap,
    bulkQuickType,
    openTransactionDatePrompt,
  ]);

  const cancelBulkSubmit = useCallback(() => {
    setBulkConfirmOpen(false);
  }, []);

  const confirmTransactionDate = useCallback(() => {
    if (!pendingSubmit) return;
    const today = todayDate || getBangkokTodayDateString();
    if (!isValidTransactionDateString(transactionDate, today)) {
      alert('กรุณาเลือกวันที่ที่ถูกต้อง (ไม่เกินวันนี้)');
      return;
    }

    const transactionAt = bangkokDateStringToTransactionAt(transactionDate);
    setTransactionDateModalOpen(false);
    const pending = pendingSubmit;
    setPendingSubmit(null);

    if (yesterdayDate && transactionDate === yesterdayDate) {
      setHasYesterdayInOutGap(false);
      try {
        localStorage.setItem(getGapDismissStorageKey(yesterdayDate), '1');
      } catch {
        /* ignore */
      }
    }

    if (pending.kind === 'single') {
      void executeSingleSubmit(pending, transactionAt);
    } else {
      void executeBulkSubmit(transactionAt);
    }
  }, [
    pendingSubmit,
    todayDate,
    transactionDate,
    yesterdayDate,
    executeBulkSubmit,
    executeSingleSubmit,
  ]);

  const cancelTransactionDate = useCallback(() => {
    setTransactionDateModalOpen(false);
    const wasBulk = pendingSubmit?.kind === 'bulk';
    setPendingSubmit(null);
    if (wasBulk) setBulkConfirmOpen(true);
  }, [pendingSubmit]);

  const handleQuickSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isReadOnly) {
        alert(READ_ONLY_DENY_MSG);
        return;
      }
      if (isQuickPending || backgroundSyncRef.current) return;

      if (bulkMode) {
        if (!bulkSubmitReady) return;
        setBulkConfirmOpen(true);
        return;
      }

      if (!quickSearch) return;
      if (quickType === 'ADJUST' && quickQty.trim() === '') return;

      const item = items.find((row) => row.name === quickSearch || row.id === quickSearch);
      if (!item) {
        alert('ไม่พบสินค้าที่ระบุค่ะ');
        return;
      }

      let qty: number;
      if (quickType === 'ADJUST') {
        qty = Number(quickQty);
        if (Number.isNaN(qty) || qty < 0) {
          alert('กรุณาระบุจำนวนคงเหลือที่ถูกต้องค่ะ');
          return;
        }
      } else {
        const resolved = resolveInOutQuantity(quickQty);
        if (resolved === null) {
          alert('กรุณาระบุจำนวนที่ถูกต้องค่ะ');
          return;
        }
        qty = resolved;
      }

      const previousStock = Number(item.stock) || 0;
      const optimisticStock = computeOptimisticStockAfterTransaction(previousStock, quickType, qty);
      if (optimisticStock === null) {
        alert('ยอดคงเหลือไม่เพียงพอสำหรับการนำออก');
        return;
      }

      if (quickType === 'ADJUST') {
        backgroundSyncRef.current = true;
        setIsQuickPending(true);
        onBeforeSave?.();

        setItems((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, stock: optimisticStock } : row)),
        );
        resetQuickEntryFields();
        clearInventoryQuickActionDraft();
        onAfterSave?.({ id: item.id, name: item.name });
        setIsQuickPending(false);

        void (async () => {
          try {
            const res = await updateInventoryStock(item.id, qty, 'Quick Entry - Adjust', {
              clientSessionId: getClientSessionId(),
              notificationSource,
            });

            if (!res.success) {
              setItems((prev) =>
                prev.map((row) => (row.id === item.id ? { ...row, stock: previousStock } : row)),
              );
              onSaveError?.();
              alert(res.error);
              return;
            }

            if (res.newStock != null && res.newStock !== optimisticStock) {
              setItems((prev) =>
                prev.map((row) => (row.id === item.id ? { ...row, stock: res.newStock! } : row)),
              );
            }

            refreshHistoryIfOpen();
          } finally {
            backgroundSyncRef.current = false;
          }
        })();
        return;
      }

      if (
        shouldPromptTransactionDate({
          backfillMode,
          hasYesterdayInOutGap,
          quickType,
        })
      ) {
        openTransactionDatePrompt({
          kind: 'single',
          item,
          qty,
          quickType,
          previousStock,
          optimisticStock,
        });
        return;
      }

      void executeSingleSubmit({
        kind: 'single',
        item,
        qty,
        quickType,
        previousStock,
        optimisticStock,
      });
    },
    [
      isReadOnly,
      isQuickPending,
      bulkMode,
      bulkSubmitReady,
      quickSearch,
      quickQty,
      items,
      quickType,
      backfillMode,
      hasYesterdayInOutGap,
      openTransactionDatePrompt,
      executeSingleSubmit,
      notificationSource,
      onBeforeSave,
      onAfterSave,
      onSaveError,
      refreshHistoryIfOpen,
      resetQuickEntryFields,
      setItems,
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
    filteredItems: resolvedFilteredItems,
    selectedQuickItem,
    quickBadgeStyles,
    bulkMode,
    setBulkMode: setBulkModeSafe,
    bulkQueue,
    bulkPreviews,
    bulkSubmitReady,
    bulkQuickType,
    bulkConfirmOpen,
    confirmBulkSubmit,
    cancelBulkSubmit,
    addBulkItemById: selectBulkQuickItem,
    selectBulkQuickItem,
    addBulkItemFromSearch,
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
    backfillMode,
    setBackfillMode,
    transactionDateModalOpen,
    transactionDate,
    setTransactionDate,
    transactionDateReason,
    confirmTransactionDate,
    cancelTransactionDate,
  };
}
