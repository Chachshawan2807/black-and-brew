'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchTransactionHistory,
  type InventoryTransactionFilterType,
} from '@/app/actions/inventory-actions';
import type { TransactionHistoryRow } from '@/app/[locale]/inventory/_components/InventoryHistoryModal';
import {
  consumeInventoryHistoryPrefetch,
  invalidateInventoryHistoryPrefetch,
  isInventoryHistoryPrefetchFresh,
  prefetchInventoryHistoryFirstPage,
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
        const res = await fetchTransactionHistory({
          type,
          itemNameQuery: searchQuery || undefined,
          offset,
          limit: HISTORY_PAGE_SIZE,
        });

        if (requestId !== requestIdRef.current) return;

        if (res.success && res.data) {
          setTransactionHistory((prev) => (append ? [...prev, ...res.data] : res.data));
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
    setShowHistoryModal(true);
    void prefetchInventoryHistoryFirstPage();
  }, []);

  const handleHistoryTypeFilterChange = useCallback((nextType: InventoryTransactionFilterType) => {
    setHistoryTypeFilter(nextType);
  }, []);

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

    void (async () => {
      const canUsePrefetch = historyTypeFilter === 'ALL' && historySearchDebounced === '';

      if (canUsePrefetch) {
        const prefetched = await consumeInventoryHistoryPrefetch();
        if (cancelled) return;

        if (prefetched?.success && prefetched.data) {
          setTransactionHistory(prefetched.data);
          setHasMoreHistory(Boolean(prefetched.hasMore));

          if (isInventoryHistoryPrefetchFresh()) {
            return;
          }
        }
      }

      if (!cancelled) {
        await loadHistoryPage({ offset: 0 });
      }
    })();

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
    };
  }, [historySearchDebounced, historyTypeFilter, showHistoryModal, loadHistoryPage]);

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
