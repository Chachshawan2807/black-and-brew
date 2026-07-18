'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';

const AIChatOverlay = dynamic(() => import('@/components/ai/AIChatOverlay'), { ssr: false });
const InventoryQuickActionWrapper = dynamic(
  () => import('@/app/[locale]/inventory/_components/InventoryQuickActionWrapper'),
  { ssr: false },
);
const InventoryNotificationFAB = dynamic(
  () =>
    import('@/components/notifications/InventoryNotificationFAB').then((m) => ({
      default: m.InventoryNotificationFAB,
    })),
  { ssr: false },
);

/**
 * Defers heavy global overlays until after first paint / idle so route content can hydrate first.
 */
export function DeferredOverlays() {
  const [overlaysReady, setOverlaysReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cancelIdle = scheduleIdleWork(
      () => {
        if (!cancelled) setOverlaysReady(true);
      },
      { timeout: 1500 },
    );
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, []);

  if (!overlaysReady) return null;

  return (
    <>
      <InventoryQuickActionWrapper />
      <InventoryNotificationFAB />
      <AIChatOverlay />
    </>
  );
}
