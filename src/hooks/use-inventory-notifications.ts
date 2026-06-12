'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { supabase } from '@/lib/supabase';
import { isOwnChange, getClientSessionId } from '@/lib/client-session';
import { createBatchAccumulator } from '@/lib/inventory-notification-batching';
import {
  formatBatchedNotification,
  formatInventoryNotification,
  shouldShowToast,
} from '@/lib/inventory-notification-formatter';
import {
  loadNotificationPreferences,
  shouldNotifyForAction,
} from '@/lib/notification-preferences';
import {
  countUnread,
  loadStoredNotifications,
  saveStoredNotifications,
} from '@/lib/notification-storage';
import type {
  InventoryNotification,
  NotificationPreferences,
  NotificationToastState,
} from '@/lib/notification-types';
import { MAX_STORED_NOTIFICATIONS } from '@/lib/notification-types';
import type { DataChangeAction } from '@/lib/data-change-log';

function rowFromPayload(payload: { new: Record<string, unknown> }): DataChangeLogRow {
  const row = payload.new;
  return {
    id: String(row.id),
    occurred_at: String(row.occurred_at),
    actor_id: row.actor_id ? String(row.actor_id) : null,
    actor_label: String(row.actor_label),
    actor_access_level: (row.actor_access_level as DataChangeLogRow['actor_access_level']) ?? null,
    action: String(row.action),
    module: String(row.module),
    entity_type: String(row.entity_type),
    entity_id: row.entity_id ? String(row.entity_id) : null,
    entity_label: row.entity_label ? String(row.entity_label) : null,
    field_changes: (row.field_changes as DataChangeLogRow['field_changes']) ?? [],
    old_value: row.old_value as DataChangeLogRow['old_value'],
    new_value: row.new_value as DataChangeLogRow['new_value'],
    source: String(row.source),
    ip_address: row.ip_address ? String(row.ip_address) : null,
    user_agent: row.user_agent ? String(row.user_agent) : null,
    status: String(row.status),
    error_message: row.error_message ? String(row.error_message) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function prependNotification(
  list: InventoryNotification[],
  notification: InventoryNotification
): InventoryNotification[] {
  const deduped = list.filter((n) => n.logId !== notification.logId);
  return [notification, ...deduped].slice(0, MAX_STORED_NOTIFICATIONS);
}

export function useInventoryNotifications() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';

  const [notifications, setNotifications] = useState<InventoryNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<NotificationToastState | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPreferences());

  const prefsRef = useRef(prefs);
  const localeRef = useRef(locale);
  const sessionIdRef = useRef('');

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    sessionIdRef.current = getClientSessionId();
    const stored = loadStoredNotifications();
    setNotifications(stored);
    setUnreadCount(countUnread(stored));
  }, []);

  const persist = useCallback((next: InventoryNotification[]) => {
    setNotifications(next);
    setUnreadCount(countUnread(next));
    saveStoredNotifications(next);
  }, []);

  const pushNotification = useCallback(
    (notification: InventoryNotification) => {
      setNotifications((prev) => {
        const next = prependNotification(prev, notification);
        setUnreadCount(countUnread(next));
        saveStoredNotifications(next);
        return next;
      });

      const currentPrefs = prefsRef.current;
      if (currentPrefs.showToast && shouldShowToast(notification)) {
        setToast({ notification, visible: true });
      }
    },
    []
  );

  const processRows = useCallback(
    (rows: DataChangeLogRow[]) => {
      const currentPrefs = prefsRef.current;
      const sessionId = sessionIdRef.current;
      const loc = localeRef.current;

      const eligible = rows.filter((row) => {
        if (row.module !== 'inventory' || row.status !== 'success') return false;
        if (!shouldNotifyForAction(currentPrefs, row.action as DataChangeAction)) return false;
        if (!currentPrefs.notifyOwnChanges && isOwnChange(row.metadata, sessionId)) return false;
        return true;
      });

      if (eligible.length === 0) return;

      const latest = eligible[eligible.length - 1];
      const notification =
        eligible.length > 1
          ? formatBatchedNotification(latest, eligible.length, loc)
          : formatInventoryNotification(latest, loc);

      pushNotification(notification);
    },
    [pushNotification]
  );

  useEffect(() => {
    const batcher = createBatchAccumulator((rows) => processRows(rows));

    const channel = supabase
      .channel('inventory_change_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'data_change_logs', filter: 'module=eq.inventory' },
        (payload) => {
          if (!payload.new) return;
          const row = rowFromPayload(payload as { new: Record<string, unknown> });
          batcher.add(row);
        }
      )
      .subscribe();

    const onPrefsChange = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPreferences>).detail;
      if (detail) setPrefs(detail);
      else setPrefs(loadNotificationPreferences());
    };

    window.addEventListener('bb-notification-prefs-changed', onPrefsChange);

    return () => {
      batcher.dispose();
      supabase.removeChannel(channel);
      window.removeEventListener('bb-notification-prefs-changed', onPrefsChange);
    };
  }, [processRows]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      setUnreadCount(0);
      saveStoredNotifications(next);
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      setUnreadCount(countUnread(next));
      saveStoredNotifications(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const dismissToast = useCallback(() => {
    setToast((prev) => (prev ? { ...prev, visible: false } : null));
  }, []);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return {
    notifications,
    unreadCount,
    panelOpen,
    toast,
    prefs,
    setPrefs,
    markAllRead,
    markRead,
    clearAll,
    dismissToast,
    openPanel,
    closePanel,
    setPanelOpen,
  };
}
