'use client';

import { useEffect } from 'react';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotificationState, useNotificationActions } from '@/components/notifications/NotificationProvider';

export function InventoryNotificationFAB() {
  const { panelOpen } = useNotificationState();
  const { setPanelOpen } = useNotificationActions();
  const { fabStackHidden, isAnyOtherOpen, setOverlayOpen } = useFloatingOverlay();

  const hidden = panelOpen || isAnyOtherOpen('notification') || fabStackHidden;

  useEffect(() => {
    setOverlayOpen('notification', panelOpen);
  }, [panelOpen, setOverlayOpen]);

  useEffect(() => {
    if (fabStackHidden && panelOpen) {
      setPanelOpen(false);
    }
  }, [fabStackHidden, panelOpen, setPanelOpen]);

  if (hidden) return null;

  return <NotificationBell variant="fab" />;
}
