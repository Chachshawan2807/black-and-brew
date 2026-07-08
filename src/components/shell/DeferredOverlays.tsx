'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

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

function scheduleIdleWork(callback: () => void) {
  if (typeof window === 'undefined') return;
  const schedule = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
  schedule(callback);
}

/**
 * Defers heavy global overlays until after first paint / idle so route content can hydrate first.
 */
export function DeferredOverlays() {
  const [overlaysReady, setOverlaysReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    scheduleIdleWork(() => {
      if (!cancelled) setOverlaysReady(true);
    });
    return () => {
      cancelled = true;
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
