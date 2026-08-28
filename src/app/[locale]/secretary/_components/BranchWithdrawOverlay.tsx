'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  fetchBranchWithdrawInventoryItems,
  fetchBranchWithdrawalHistory,
  type BranchWithdrawHistoryRow,
} from '@/app/actions/branch-withdraw-actions';
import type { InventoryRealtimeItem } from '@/contexts/InventoryRealtimeContext';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { cn } from '@/lib/utils';

const BranchWithdrawClient = dynamic(() => import('@/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient'), {
  ssr: false,
  loading: () => (
    <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">กำลังโหลดเบิกของสาขา 2...</div>
  ),
});

type BranchWithdrawOverlayProps = {
  locale: string;
  onClose: () => void;
};

export default function BranchWithdrawOverlay({ locale, onClose }: BranchWithdrawOverlayProps) {
  const [history, setHistory] = useState<BranchWithdrawHistoryRow[]>([]);
  const [items, setItems] = useState<InventoryRealtimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setLoadError(null);
      const [itemsResult, historyResult] = await Promise.all([
        fetchBranchWithdrawInventoryItems(),
        fetchBranchWithdrawalHistory(30),
      ]);
      if (cancelled) return;
      if (!itemsResult.success) {
        setLoadError(itemsResult.error ?? 'ไม่สามารถโหลดรายการคลังได้');
        setItems([]);
      } else {
        setItems(itemsResult.data as InventoryRealtimeItem[]);
      }
      setHistory(historyResult.success ? historyResult.data : []);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ModalPortal>
      <FadeModalScaffold
        open
        onClose={onClose}
        zIndex={220}
        overlayClassName={cn('bg-black/20 backdrop-blur-md', INVENTORY_MODAL_Z_CLASS)}
        layoutClassName="items-end justify-center p-0 md:items-center md:p-4"
        panelClassName="w-full max-w-3xl"
        aria-label="เบิกของสาขา 2"
      >
        <div className="flex max-h-[min(92svh,100%)] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-background md:max-h-[85svh] md:rounded-3xl">
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
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                กำลังโหลดเบิกของสาขา 2...
              </div>
            ) : loadError ? (
              <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">{loadError}</div>
            ) : (
              <BranchWithdrawClient
                embedded
                initialItems={items}
                initialHistory={history}
                locale={locale}
              />
            )}
          </div>
        </div>
      </FadeModalScaffold>
    </ModalPortal>
  );
}
