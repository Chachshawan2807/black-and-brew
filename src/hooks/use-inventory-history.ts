'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchTransactionHistory,
  type InventoryTransactionFilterType,
} from '@/app/actions/inventory-actions';
import type { TransactionHistoryRow } from '@/app/[locale]/inventory/_components/InventoryHistoryModal';
import {
  getHistoryPageCache,
  invalidateInventoryHistoryPrefetch,
  isHistoryPageCacheFresh,
  prefetchInventoryHistoryFirstPage,
  prefetchInventoryHistoryPage,
  setHistoryPageCache,
  warmInventoryHistoryFilterPages,
} from '@/lib/inventory-history-prefetch';

const HISTORY_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 200;

export function useInventoryHistory() {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryRow[]>([]);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<InventoryTransactionFilterType>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historySearchDebounced, setHistorySearchDebounced] = useState('');
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryRefreshing, setIsHistoryRefreshing] = useState(false);

  const requestIdRef = useRef(0);
  const transactionHistoryRef = useRef(transactionHistory);
  transactionHistoryRef.current = transactionHistory;

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
            : await fetchTransactionHistory({
                type,
                itemNameQuery: searchQuery || undefined,
                offset,
                limit: HISTORY_PAGE_SIZE,
              });

        if (requestId !== requestIdRef.current) return;

        if (res.success && res.data) {
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
        } else if (res.error) {
          console.error('[UI] History fetch failed:', res.error);
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
    void prefetchInventoryHistoryFirstPage();
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
