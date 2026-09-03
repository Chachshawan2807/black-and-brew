'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchBranchWithdrawInventoryItems,
  fetchBranchWithdrawalHistory,
  type BranchWithdrawHistoryRow,
} from '@/app/actions/branch-withdraw-actions';
import BranchWithdrawClient from '@/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient';
import { useInventoryRealtime } from '@/contexts/InventoryRealtimeContext';
import { mapSecretaryReorderItemsToInventoryRealtime } from '@/lib/inventory-branch-withdraw-seed';
import type { SecretaryReorderItem } from '@/lib/secretary/types';
import SecretaryTaskSubwindow from './SecretaryTaskSubwindow';

type BranchWithdrawOverlayProps = {
  locale: string;
  seedItems: SecretaryReorderItem[];
  catalogSeedItems: SecretaryReorderItem[];
  onClose: () => void;
};

export default function BranchWithdrawOverlay({
  locale,
  seedItems,
  catalogSeedItems,
  onClose,
}: BranchWithdrawOverlayProps) {
  const { items: realtimeItems, hasLoaded: hasRealtimeInventory } = useInventoryRealtime();
  const displaySeed = useMemo(
    () => mapSecretaryReorderItemsToInventoryRealtime(seedItems),
    [seedItems],
  );
  const catalogSeed = useMemo(
    () => mapSecretaryReorderItemsToInventoryRealtime(catalogSeedItems),
    [catalogSeedItems],
  );
  const hasCatalogSeed = catalogSeedItems.length > 0;

  const [fetchedItems, setFetchedItems] = useState<typeof displaySeed | null>(null);
  const [history, setHistory] = useState<BranchWithdrawHistoryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(
    () => !hasRealtimeInventory && !hasCatalogSeed,
  );

  const initialItems = useMemo(() => {
    if (hasRealtimeInventory && realtimeItems.length > 0) {
      return realtimeItems;
    }
    if (fetchedItems && fetchedItems.length > 0) {
      return fetchedItems;
    }
    if (catalogSeed.length > 0) {
      return catalogSeed;
    }
    return displaySeed;
  }, [catalogSeed, displaySeed, fetchedItems, hasRealtimeInventory, realtimeItems]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const historyPromise = fetchBranchWithdrawalHistory(30);
      const needsCatalogFetch = !hasRealtimeInventory && !hasCatalogSeed;

      if (needsCatalogFetch) {
        const itemsResult = await fetchBranchWithdrawInventoryItems();
        if (cancelled) return;
        if (!itemsResult.success) {
          setLoadError(itemsResult.error ?? 'ไม่สามารถโหลดรายการคลังได้');
        } else {
          setFetchedItems(itemsResult.data as typeof displaySeed);
        }
      }

      if (!cancelled) {
        setCatalogLoading(false);
      }

      const historyResult = await historyPromise;
      if (cancelled) return;
      setHistory(historyResult.success ? historyResult.data : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [hasCatalogSeed, hasRealtimeInventory]);

  return (
    <SecretaryTaskSubwindow title="เบิกของสาขา 2" onClose={onClose}>
      {loadError ? (
        <p className="mb-2 text-center text-[13px] text-muted-foreground">{loadError}</p>
      ) : null}
      <BranchWithdrawClient
        embedded
        initialItems={initialItems}
        initialHistory={history}
        locale={locale}
        catalogLoading={catalogLoading}
      />
    </SecretaryTaskSubwindow>
  );
}
