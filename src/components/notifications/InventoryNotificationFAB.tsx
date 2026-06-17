'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { FabFadePresence } from '@/components/floating/FabFadePresence';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotificationState, useNotificationActions } from '@/components/notifications/NotificationProvider';
import { FAB_BOTTOM_NOTIFICATION_CLASS } from '@/lib/floating-action-layout';

export function InventoryNotificationFAB() {
  const { panelOpen } = useNotificationState();
  const { setPanelOpen } = useNotificationActions();
  const { fabStackHidden, setOverlayOpen } = useFloatingOverlay();

  const hidden = panelOpen || fabStackHidden;

  useEffect(() => {
    setOverlayOpen('notification', panelOpen);
  }, [panelOpen, setOverlayOpen]);

  useEffect(() => {
    if (fabStackHidden && panelOpen) {
      setPanelOpen(false);
    }
  }, [fabStackHidden, panelOpen, setPanelOpen]);

  return (
    <FabFadePresence
      visible={!hidden}
      presenceKey="inventory-notification-fab"
      className={cn(FAB_BOTTOM_NOTIFICATION_CLASS, 'z-[201]')}
    >
      <NotificationBell variant="fab" stacked />
    </FabFadePresence>
  );
}
