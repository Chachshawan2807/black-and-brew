'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { FabFadePresence } from '@/components/floating/FabFadePresence';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotificationState, useNotificationActions } from '@/components/notifications/NotificationProvider';
import {
  FAB_BOTTOM_NOTIFICATION_CLASS,
  shouldHideMobileFabTriggersForOverlay,
} from '@/lib/floating-action-layout';
import { useMaxMd } from '@/hooks/use-max-md';

export function InventoryNotificationFAB() {
  const { panelOpen } = useNotificationState();
  const { setPanelOpen } = useNotificationActions();
  const { fabStackHidden, fabStackSuppressed, isAnyOtherOpen, setOverlayOpen } = useFloatingOverlay();
  const maxMd = useMaxMd();
  const isMobile = maxMd === true;

  const hidden =
    fabStackHidden ||
    fabStackSuppressed ||
    isAnyOtherOpen('notification') ||
    shouldHideMobileFabTriggersForOverlay(isMobile, panelOpen);

  useEffect(() => {
    setOverlayOpen('notification', panelOpen);
  }, [panelOpen, setOverlayOpen]);

  useEffect(() => {
    if ((fabStackHidden || fabStackSuppressed) && panelOpen) {
      setPanelOpen(false);
    }
  }, [fabStackHidden, fabStackSuppressed, panelOpen, setPanelOpen]);

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
