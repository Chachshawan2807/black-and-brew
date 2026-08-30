'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  fetchBranchWithdrawInventoryItems,
  fetchBranchWithdrawalHistory,
  type BranchWithdrawHistoryRow,
} from '@/app/actions/branch-withdraw-actions';
import BranchWithdrawClient from '@/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient';
import { useInventoryRealtime } from '@/contexts/InventoryRealtimeContext';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { mapSecretaryReorderItemsToInventoryRealtime } from '@/lib/inventory-branch-withdraw-seed';
import type { SecretaryReorderItem } from '@/lib/secretary/types';
import { cn } from '@/lib/utils';

type BranchWithdrawOverlayProps = {
  locale: string;
  seedItems: SecretaryReorderItem[];
  onClose: () => void;
};

export default function BranchWithdrawOverlay({
  locale,
  seedItems,
  onClose,
}: BranchWithdrawOverlayProps) {
  const { items: realtimeItems, hasLoaded: hasRealtimeInventory } = useInventoryRealtime();
  const seedInventory = useMemo(
    () => mapSecretaryReorderItemsToInventoryRealtime(seedItems),
    [seedItems],
  );

  const [fetchedItems, setFetchedItems] = useState<typeof seedInventory | null>(null);
  const [history, setHistory] = useState<BranchWithdrawHistoryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(!hasRealtimeInventory);

  const initialItems = useMemo(() => {
    if (hasRealtimeInventory && realtimeItems.length > 0) {
      return realtimeItems;
    }
    if (fetchedItems && fetchedItems.length > 0) {
      return fetchedItems;
    }
    return seedInventory;
  }, [fetchedItems, hasRealtimeInventory, realtimeItems, seedInventory]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const historyPromise = fetchBranchWithdrawalHistory(30);

      if (!hasRealtimeInventory) {
        const itemsResult = await fetchBranchWithdrawInventoryItems();
        if (cancelled) return;
        if (!itemsResult.success) {
          setLoadError(itemsResult.error ?? 'ไม่สามารถโหลดรายการคลังได้');
        } else {
          setFetchedItems(itemsResult.data as typeof seedInventory);
        }
        setCatalogLoading(false);
      } else {
        setCatalogLoading(false);
      }

      const historyResult = await historyPromise;
      if (cancelled) return;
      setHistory(historyResult.success ? historyResult.data : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [hasRealtimeInventory]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <ModalPortal>
      <FadeModalScaffold
        open
        onClose={onClose}
        zIndex={220}
        overlayClassName={cn('bg-black/20 backdrop-blur-md', INVENTORY_MODAL_Z_CLASS)}
        layoutClassName="items-end justify-center p-3 pt-12 md:items-center md:p-4"
        panelClassName="flex w-full max-w-3xl min-h-0 max-md:h-[min(85svh,calc(100dvh-3.75rem))] flex-col overflow-hidden md:max-h-[85svh]"
        aria-label="เบิกของสาขา 2"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-background">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-normal text-foreground">เบิกของสาขา 2</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/50"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
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
          </div>
        </div>
      </FadeModalScaffold>
    </ModalPortal>
  );
}
