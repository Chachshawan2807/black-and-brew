'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { isOwnChange, getClientSessionId } from '@/lib/client-session';
import { createBatchAccumulator } from '@/lib/inventory-notification-batching';
import {
  formatBatchedNotification,
  formatInventoryNotification,
} from '@/lib/inventory-notification-formatter';
import { isSuppressedInventoryNotification } from '@/lib/inventory-notification-filter';
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
} from '@/lib/notification-types';
import { MAX_STORED_NOTIFICATIONS } from '@/lib/notification-types';
import type { DataChangeAction } from '@/lib/data-change-log';
import {
  showSystemNotification,
  syncAppBadge,
} from '@/lib/pwa-notification-bridge';

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

  useEffect(() => {
    void syncAppBadge(unreadCount);
  }, [unreadCount]);

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
      if (currentPrefs.enabled && currentPrefs.systemNotifications) {
        const loc = localeRef.current;
        const inventoryPath = `/${loc}/inventory`;
        const shouldShowOsBanner =
          typeof document !== 'undefined' &&
          (document.hidden || !document.hasFocus());

        if (shouldShowOsBanner) {
          void showSystemNotification(notification.title, notification.summary, {
            tag: notification.logId,
            url: notification.entityId
              ? `${inventoryPath}?highlight=${notification.entityId}`
              : inventoryPath,
          });
        }
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
        if (isSuppressedInventoryNotification(row.metadata)) return false;
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
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryCount = 0;
    let warnedUnavailable = false;
    const batcher = createBatchAccumulator((rows) => processRows(rows));

    const subscribe = async () => {
      await ensureSupabaseSession();
      if (cancelled) return;

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(`inventory_change_notifications_${retryCount}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'data_change_logs',
            filter: 'module=eq.inventory',
          },
          (payload) => {
            if (!payload.new) return;
            const row = rowFromPayload(payload as { new: Record<string, unknown> });
            batcher.add(row);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
            return;
          }

          if (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT' && status !== 'CLOSED') {
            return;
          }

          if (retryCount < 4 && !cancelled) {
            retryCount += 1;
            retryTimer = setTimeout(() => {
              void subscribe();
            }, Math.min(1000 * 2 ** retryCount, 12_000));
            return;
          }

          if (!warnedUnavailable) {
            warnedUnavailable = true;
            console.warn(
              '[inventory notifications] Realtime unavailable — run scripts/apply-pending-migrations.sql on Supabase if not applied',
              err?.message ?? status
            );
          }
        });
    };

    void subscribe();

    const onPrefsChange = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPreferences>).detail;
      if (detail) setPrefs(detail);
      else setPrefs(loadNotificationPreferences());
    };

    window.addEventListener('bb-notification-prefs-changed', onPrefsChange);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      batcher.dispose();
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener('bb-notification-prefs-changed', onPrefsChange);
    };
  }, [processRows]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      setUnreadCount(0);
      saveStoredNotifications(next);
      void syncAppBadge(0);
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      const unread = countUnread(next);
      setUnreadCount(unread);
      saveStoredNotifications(next);
      void syncAppBadge(unread);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return {
    notifications,
    unreadCount,
    panelOpen,
    prefs,
    setPrefs,
    markAllRead,
    markRead,
    clearAll,
    openPanel,
    closePanel,
    setPanelOpen,
  };
}
