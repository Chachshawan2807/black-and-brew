'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { fetchInventoryCountOverlayData } from '@/app/actions/secretary-overlay-actions';
import type { SecretaryTask } from '@/lib/secretary/types';
import SecretaryTaskSubwindow from './SecretaryTaskSubwindow';

const InventoryCountClient = dynamic(
  () => import('@/app/[locale]/inventory/count/InventoryCountClient'),
  { ssr: false },
);

type InventoryCountOverlayProps = {
  task: SecretaryTask;
  locale: string;
  onClose: () => void;
};

export default function InventoryCountOverlay({ task, locale, onClose }: InventoryCountOverlayProps) {
  const [payload, setPayload] = useState<Awaited<
    ReturnType<typeof fetchInventoryCountOverlayData>
  >['data'] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const initialPageMode =
    task.task_type === 'inventory_accuracy_review' ? ('adjust' as const) : ('count' as const);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchInventoryCountOverlayData();
      if (cancelled) return;
      if (!result.success || !result.data) {
        setLoadError(result.error ?? 'ไม่สามารถโหลดข้อมูลตรวจนับได้');
        setPayload(null);
        return;
      }
      setPayload(result.data);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SecretaryTaskSubwindow title={task.title} onClose={onClose} maxWidthClass="max-w-xl">
      {loadError ? (
        <p className="mb-2 text-center text-[13px] text-muted-foreground">{loadError}</p>
      ) : null}
      {!payload ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">กำลังโหลด...</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bb-smooth-scroll [scrollbar-width:thin]">
          <InventoryCountClient
            initialItems={payload.items as never[]}
            initialAccuracyStats={payload.initialAccuracyStats}
            initialTodayStatus={payload.initialTodayStatus}
            locale={locale}
            embedded
            initialPageMode={initialPageMode}
          />
        </div>
      )}
    </SecretaryTaskSubwindow>
  );
}
