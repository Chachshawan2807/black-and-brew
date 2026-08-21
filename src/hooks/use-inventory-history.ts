'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { fetchTransactionHistoryClient } from '@/lib/inventory-history-client';
import type {
  InventoryTransactionFilterType,
  InventoryTransactionType,
} from '@/lib/inventory-history-query';
import type { TransactionHistoryRow } from '@/app/[locale]/inventory/_components/InventoryHistoryModal';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { scheduleSupabaseChannelTeardown } from '@/lib/supabase-realtime-channel';
import { HISTORY_PAGE_SIZE } from '@/lib/inventory-history-query';
import {
  getHistoryPageCache,
  invalidateInventoryHistoryPrefetch,
  isHistoryPageCacheFresh,
  prefetchInventoryHistoryFirstPage,
  prefetchInventoryHistoryPage,
  seedInventoryHistoryCacheIfEmpty,
  setHistoryPageCache,
  warmInventoryHistoryFilterPages,
} from '@/lib/inventory-history-prefetch';

const SEARCH_DEBOUNCE_MS = 200;

type RealtimeTransactionRow = {
  id: string;
  inventory_item_id: string | null;
  type: InventoryTransactionType;
  quantity: number;
  note: string | null;
  created_at: string;
  transaction_at?: string | null;
  balance_after: number;
};

type UseInventoryHistoryOptions = {
  initialTransactionHistory?: TransactionHistoryRow[];
  initialHistoryHasMore?: boolean;
  resolveItemName?: (itemId: string | null) => string | undefined;
};

type InitialHistoryState = {
  rows: TransactionHistoryRow[];
  hasMore: boolean;
};

export function getInitialHistoryState(
  options?: Pick<UseInventoryHistoryOptions, 'initialTransactionHistory' | 'initialHistoryHasMore'>,
): InitialHistoryState {
  const cached = getHistoryPageCache({ type: 'ALL', searchQuery: '' });
  if (cached?.data?.length) {
    return {
      rows: cached.data as TransactionHistoryRow[],
      hasMore: cached.hasMore,
    };
  }

  const initialRows = options?.initialTransactionHistory ?? [];
  if (initialRows.length > 0) {
    return {
      rows: initialRows,
      hasMore: options?.initialHistoryHasMore ?? false,
    };
  }

  return { rows: [], hasMore: false };
}

function matchesHistoryFilter(
  row: Pick<RealtimeTransactionRow, 'type' | 'note'>,
  itemName: string | undefined,
  typeFilter: InventoryTransactionFilterType,
  searchQuery: string,
): boolean {
  if (typeFilter !== 'ALL' && row.type !== typeFilter) return false;
  if (!searchQuery) return true;

  const q = searchQuery.toLowerCase();
  if (itemName?.toLowerCase().includes(q)) return true;
  if ((row.type === 'ADD' || row.type === 'DELETE') && row.note?.toLowerCase().includes(q)) {
    return true;
  }
  return false;
}

function toHistoryRow(
  raw: RealtimeTransactionRow,
  resolveItemName?: (itemId: string | null) => string | undefined,
): TransactionHistoryRow {
  const resolvedName =
    resolveItemName?.(raw.inventory_item_id) ||
    (raw.type === 'DELETE' && raw.note ? raw.note : null) ||
    (raw.type === 'ADD' && raw.note ? raw.note : null) ||
    'ไม่ทราบชื่อสินค้า';

  return {
    id: raw.id,
    created_at: raw.created_at,
    transaction_at: raw.transaction_at,
    type: raw.type,
    quantity: raw.quantity,
    balance_after: raw.balance_after,
    inventory_items: { name: resolvedName },
  };
}

export function useInventoryHistory(options?: UseInventoryHistoryOptions) {
  const seededRef = useRef(false);
  if (!seededRef.current && options?.initialTransactionHistory) {
    seedInventoryHistoryCacheIfEmpty(
      { type: 'ALL', searchQuery: '' },
      {
        data: options.initialTransactionHistory,
        hasMore: options.initialHistoryHasMore ?? false,
      },
    );
    seededRef.current = true;
  }

  const resolveItemNameRef = useRef(options?.resolveItemName);
  resolveItemNameRef.current = options?.resolveItemName;

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryRow[]>(() =>
    getInitialHistoryState(options).rows,
  );
  const [historyTypeFilter, setHistoryTypeFilter] = useState<InventoryTransactionFilterType>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historySearchDebounced, setHistorySearchDebounced] = useState('');
  const [hasMoreHistory, setHasMoreHistory] = useState(
    () => getInitialHistoryState(options).hasMore,
  );
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryRefreshing, setIsHistoryRefreshing] = useState(false);

  const requestIdRef = useRef(0);
  const transactionHistoryRef = useRef(transactionHistory);
  transactionHistoryRef.current = transactionHistory;
  const historyTypeFilterRef = useRef(historyTypeFilter);
  historyTypeFilterRef.current = historyTypeFilter;
  const historySearchDebouncedRef = useRef(historySearchDebounced);
  historySearchDebouncedRef.current = historySearchDebounced;

  useEffect(() => {
    const timer = setTimeout(() => {
      setHistorySearchDebounced(historySearchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [historySearchQuery]);

  const applyCachedPage = useCallback(
    (type: InventoryTransactionFilterType, searchQuery: string) => {
      const cached = getHistoryPageCache({ type, searchQuery });
      if (!cached) return null;
      setTransactionHistory(cached.data as TransactionHistoryRow[]);
      setHasMoreHistory(cached.hasMore);
      return cached;
    },
    [],
  );

  const prependRealtimeTransaction = useCallback((raw: RealtimeTransactionRow) => {
    const row = toHistoryRow(raw, resolveItemNameRef.current);
    const type = historyTypeFilterRef.current;
    const searchQuery = historySearchDebouncedRef.current;
    const itemName = row.inventory_items?.name;

    if (!matchesHistoryFilter(raw, itemName, type, searchQuery)) return;

    setTransactionHistory((prev) => {
      if (prev.some((tx) => tx.id === row.id)) return prev;
      return [row, ...prev];
    });

    const cacheKeys: Array<{ type: InventoryTransactionFilterType; searchQuery: string }> = [
      { type: 'ALL', searchQuery: '' },
    ];
    if (type !== 'ALL' || searchQuery) {
      cacheKeys.push({ type, searchQuery });
    }

    for (const key of cacheKeys) {
      if (!matchesHistoryFilter(raw, itemName, key.type, key.searchQuery)) continue;
      const cached = getHistoryPageCache(key);
      if (!cached) continue;
      const nextData = [row, ...cached.data.filter((tx) => tx.id !== row.id)].slice(
        0,
        HISTORY_PAGE_SIZE,
      );
      setHistoryPageCache(key, { data: nextData, hasMore: cached.hasMore });
    }
  }, []);

  const loadHistoryPage = useCallback(
    async ({
      type = historyTypeFilter,
      searchQuery = historySearchDebounced,
      offset = 0,
      append = false,
    }: {
      type?: InventoryTransactionFilterType;
      searchQuery?: string;
      offset?: number;
      append?: boolean;
    } = {}) => {
      const requestId = ++requestIdRef.current;
      const hasExistingData = append || transactionHistoryRef.current.length > 0;

      if (append || !hasExistingData) {
        setIsHistoryLoading(true);
      } else {
        setIsHistoryRefreshing(true);
      }

      try {
        const res =
          offset === 0 && !append
            ? await prefetchInventoryHistoryPage({ type, searchQuery })
            : await fetchTransactionHistoryClient({
                type,
                itemNameQuery: searchQuery || undefined,
                offset,
                limit: HISTORY_PAGE_SIZE,
              });

        if (requestId !== requestIdRef.current) return;

        if (!res.success) {
          console.error('[UI] History fetch failed:', res.error);
          if (!append) setHasMoreHistory(false);
        } else if (res.data) {
          if (offset === 0 && !append) {
            setHistoryPageCache(
              { type, searchQuery },
              { data: res.data, hasMore: Boolean(res.hasMore) },
            );
          }
          setTransactionHistory((prev) =>
            append ? [...prev, ...(res.data as TransactionHistoryRow[])] : (res.data as TransactionHistoryRow[]),
          );
          setHasMoreHistory(Boolean(res.hasMore));
        } else {
          if (!append) setHasMoreHistory(false);
        }
      } finally {
        if (requestId !== requestIdRef.current) return;
        setIsHistoryLoading(false);
        setIsHistoryRefreshing(false);
      }
    },
    [historySearchDebounced, historyTypeFilter],
  );

  const handleOpenHistory = useCallback(() => {
    setHistoryTypeFilter('ALL');
    setHistorySearchQuery('');
    setHistorySearchDebounced('');
    const cached = applyCachedPage('ALL', '');
    if (!cached) {
      setTransactionHistory([]);
      setHasMoreHistory(false);
    }
    setShowHistoryModal(true);
    const cachedAll = getHistoryPageCache({ type: 'ALL', searchQuery: '' });
    if (!cachedAll || !isHistoryPageCacheFresh(cachedAll.savedAt)) {
      void prefetchInventoryHistoryFirstPage();
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => warmInventoryHistoryFilterPages(), { timeout: 4_000 });
    } else {
      setTimeout(() => warmInventoryHistoryFilterPages(), 250);
    }
  }, [applyCachedPage]);

  const handleHistoryTypeFilterChange = useCallback(
    (nextType: InventoryTransactionFilterType) => {
      setHistoryTypeFilter(nextType);
      const cached = applyCachedPage(nextType, historySearchDebounced);
      if (!cached) {
        setTransactionHistory([]);
        setHasMoreHistory(false);
      }
    },
    [applyCachedPage, historySearchDebounced],
  );

  const handleHistorySearchQueryChange = useCallback((nextQuery: string) => {
    setHistorySearchQuery(nextQuery);
  }, []);

  const handleLoadMoreHistory = useCallback(() => {
    if (isHistoryLoading || !hasMoreHistory) return;
    void loadHistoryPage({ offset: transactionHistoryRef.current.length, append: true });
  }, [hasMoreHistory, isHistoryLoading, loadHistoryPage]);

  useEffect(() => {
    if (!showHistoryModal) {
      requestIdRef.current += 1;
      setIsHistoryLoading(false);
      setIsHistoryRefreshing(false);
      return;
    }

    let cancelled = false;
    const type = historyTypeFilter;
    const searchQuery = historySearchDebounced;

    const cached = applyCachedPage(type, searchQuery);
    if (!cached) {
      setTransactionHistory([]);
      setHasMoreHistory(false);
    } else if (isHistoryPageCacheFresh(cached.savedAt)) {
      if (type === 'ALL' && searchQuery === '') {
        warmInventoryHistoryFilterPages();
      }
      return;
    }

    void (async () => {
      if (!cancelled) {
        await loadHistoryPage({ type, searchQuery, offset: 0 });
      }
      if (!cancelled && type === 'ALL' && searchQuery === '') {
        warmInventoryHistoryFilterPages();
      }
    })();

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
    };
  }, [historySearchDebounced, historyTypeFilter, showHistoryModal, loadHistoryPage, applyCachedPage]);

  useEffect(() => {
    if (!showHistoryModal) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let teardownCancel: (() => void) | null = null;

    void ensureSupabaseSession().then(() => {
      if (cancelled || typeof supabase.channel !== 'function') return;

      channel = supabase
        .channel(`inventory_transactions_history_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'inventory_transactions' },
          (payload) => {
            prependRealtimeTransaction(payload.new as RealtimeTransactionRow);
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      teardownCancel?.();
      if (channel && typeof supabase.removeChannel === 'function') {
        teardownCancel = scheduleSupabaseChannelTeardown(channel, {
          shouldTeardown: () => true,
        });
      }
    };
  }, [showHistoryModal, prependRealtimeTransaction]);

  return {
    showHistoryModal,
    setShowHistoryModal,
    transactionHistory,
    historyTypeFilter,
    historySearchQuery,
    hasMoreHistory,
    isHistoryLoading,
    isHistoryRefreshing,
    handleOpenHistory,
    handleHistoryTypeFilterChange,
    handleHistorySearchQueryChange,
    handleLoadMoreHistory,
    refreshHistory: () => {
      invalidateInventoryHistoryPrefetch();
      return loadHistoryPage({ offset: 0 });
    },
  };
}
