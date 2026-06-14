'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNotificationState, useNotificationActions } from '@/components/notifications/NotificationProvider';
import {
  FAB_BOTTOM_AI_CLASS,
  FAB_BOTTOM_NOTIFICATION_CLASS,
} from '@/lib/floating-action-layout';

export function InventoryNotificationFAB() {
  const { panelOpen } = useNotificationState();
  const { setPanelOpen } = useNotificationActions();
  const { fabStackHidden, setOverlayOpen } = useFloatingOverlay();

  /** Keep the bell visible even when other FABs are hidden — badge must stay reachable on every page/device. */
  const hidden = panelOpen;

  useEffect(() => {
    setOverlayOpen('notification', panelOpen);
  }, [panelOpen, setOverlayOpen]);

  useEffect(() => {
    if (fabStackHidden && panelOpen) {
      setPanelOpen(false);
    }
  }, [fabStackHidden, panelOpen, setPanelOpen]);

  if (hidden) return null;

  return (
    <NotificationBell
      variant="fab"
      className={cn(fabStackHidden ? FAB_BOTTOM_AI_CLASS : FAB_BOTTOM_NOTIFICATION_CLASS)}
    />
  );
}
