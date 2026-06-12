'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useInventoryNotifications } from '@/hooks/use-inventory-notifications';
import type {
  InventoryNotification,
  NotificationPreferences,
} from '@/lib/notification-types';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

export interface NotificationState {
  notifications: InventoryNotification[];
  unreadCount: number;
  panelOpen: boolean;
  prefs: NotificationPreferences;
}

export interface NotificationActions {
  setPrefs: (prefs: NotificationPreferences) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setPanelOpen: (open: boolean) => void;
}

export type NotificationContextValue = NotificationState & NotificationActions;

const NotificationStateContext = createContext<NotificationState | null>(null);
const NotificationActionsContext = createContext<NotificationActions | null>(null);

export function useNotificationState(): NotificationState {
  const ctx = useContext(NotificationStateContext);
  if (!ctx) {
    throw new Error('useNotificationState must be used within NotificationProvider');
  }
  return ctx;
}

export function useNotificationActions(): NotificationActions {
  const ctx = useContext(NotificationActionsContext);
  if (!ctx) {
    throw new Error('useNotificationActions must be used within NotificationProvider');
  }
  return ctx;
}

/** Combined hook — prefer useNotificationState / useNotificationActions when possible. */
export function useNotifications(): NotificationContextValue {
  return { ...useNotificationState(), ...useNotificationActions() };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const hook = useInventoryNotifications();

  const state = useMemo(
    () => ({
      notifications: hook.notifications,
      unreadCount: hook.unreadCount,
      panelOpen: hook.panelOpen,
      prefs: hook.prefs,
    }),
    [hook.notifications, hook.unreadCount, hook.panelOpen, hook.prefs]
  );

  const actions = useMemo(
    () => ({
      setPrefs: hook.setPrefs,
      markAllRead: hook.markAllRead,
      markRead: hook.markRead,
      clearAll: hook.clearAll,
      openPanel: hook.openPanel,
      closePanel: hook.closePanel,
      setPanelOpen: hook.setPanelOpen,
    }),
    [
      hook.setPrefs,
      hook.markAllRead,
      hook.markRead,
      hook.clearAll,
      hook.openPanel,
      hook.closePanel,
      hook.setPanelOpen,
    ]
  );

  return (
    <NotificationActionsContext.Provider value={actions}>
      <NotificationStateContext.Provider value={state}>
        {children}
        <NotificationPanel />
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  );
}
