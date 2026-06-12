'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useInventoryNotifications } from '@/hooks/use-inventory-notifications';
import type {
  InventoryNotification,
  NotificationPreferences,
  NotificationToastState,
} from '@/lib/notification-types';
import { InventoryChangeToast } from '@/components/notifications/InventoryChangeToast';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

interface NotificationContextValue {
  notifications: InventoryNotification[];
  unreadCount: number;
  panelOpen: boolean;
  toast: NotificationToastState | null;
  prefs: NotificationPreferences;
  setPrefs: (prefs: NotificationPreferences) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  dismissToast: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setPanelOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const value = useInventoryNotifications();

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationPanel />
      <InventoryChangeToast />
    </NotificationContext.Provider>
  );
}
