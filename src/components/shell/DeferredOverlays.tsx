'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';

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
 * Notification FAB mounts earlier than quick action — badge + panel sync are time-sensitive.
 */
export function DeferredOverlays() {
  const [notificationFabReady, setNotificationFabReady] = useState(false);
  const [quickActionReady, setQuickActionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cancelNotificationFab = scheduleIdleWork(
      () => {
        if (!cancelled) setNotificationFabReady(true);
      },
      { timeout: 400 },
    );
    const cancelQuickAction = scheduleIdleWork(
      () => {
        if (!cancelled) setQuickActionReady(true);
      },
      { timeout: 1500 },
    );
    return () => {
      cancelled = true;
      cancelNotificationFab();
      cancelQuickAction();
    };
  }, []);

  return (
    <>
      {quickActionReady ? <InventoryQuickActionWrapper /> : null}
      {notificationFabReady ? <InventoryNotificationFAB /> : null}
    </>
  );
}
