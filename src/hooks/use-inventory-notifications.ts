'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  fetchDataChangeLogs,
  type DataChangeLogRow,
} from '@/app/actions/data-change-log-actions';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { isOwnChange, getClientSessionId } from '@/lib/client-session';
import { createBatchAccumulator } from '@/lib/inventory-notification-batching';
import {
  formatBatchedNotificationFromRows,
  formatInventoryNotification,
} from '@/lib/inventory-notification-formatter';
import { isEligibleInventoryNotification } from '@/lib/inventory-notification-filter';
import {
  loadNotificationPreferences,
  shouldNotifyForAction,
} from '@/lib/notification-preferences';
import {
  countUnread,
  saveStoredNotifications,
} from '@/lib/notification-storage';
import {
  mirrorNotificationsToIdb,
} from '@/lib/notification-idb';
import { prependToNotificationList, hydrateNotificationState, readNotificationState } from '@/lib/notification-sync';
import { subscribeNotificationSync } from '@/lib/notification-cross-tab';
import type {
  InventoryNotification,
  NotificationPreferences,
} from '@/lib/notification-types';
import type { DataChangeAction } from '@/lib/data-change-log';
import {
  showSystemNotification,
  syncAppBadge,
  dispatchInventoryNotificationEvent,
  getNotificationPermissionState,
  requestNotificationPermission,
  SW_INVENTORY_PUSH_RECEIVED,
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
  return prependToNotificationList(list, notification).list;
}

function resolveUnreadCountWithServiceWorkerHint(
  notifications: InventoryNotification[],
  serviceWorkerUnreadCount?: number,
): number {
  const localUnreadCount = countUnread(notifications);
  if (typeof serviceWorkerUnreadCount !== 'number') return localUnreadCount;
  return Math.max(localUnreadCount, Math.floor(serviceWorkerUnreadCount));
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
  const syncGenerationRef = useRef(0);

  const applyHydratedState = useCallback(
    (notifications: InventoryNotification[], unread: number) => {
      setNotifications(notifications);
      setUnreadCount(unread);
      void syncAppBadge(unread);
    },
    [],
  );

  const syncFromStorage = useCallback(async (writeBack = true) => {
    const generation = ++syncGenerationRef.current;
    const result = writeBack
      ? await hydrateNotificationState()
      : await readNotificationState();
    if (generation !== syncGenerationRef.current) return;
    applyHydratedState(result.notifications, result.unreadCount);
  }, [applyHydratedState]);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    sessionIdRef.current = getClientSessionId();
    void syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    void syncAppBadge(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!prefs.enabled || !prefs.systemNotifications) return;
    if (getNotificationPermissionState() !== 'default') return;
    void requestNotificationPermission();
  }, [prefs.enabled, prefs.systemNotifications]);

  const persist = useCallback((next: InventoryNotification[]) => {
    setNotifications(next);
    setUnreadCount(countUnread(next));
    saveStoredNotifications(next);
    void mirrorNotificationsToIdb(next);
  }, []);

  const pushNotification = useCallback(
    (
      notification: InventoryNotification,
      serviceWorkerUnreadCount?: number,
      options?: { skipSystemNotification?: boolean },
    ) => {
      let nextUnread = 0;
      let alreadyExists = false;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) {
          alreadyExists = true;
          return prev;
        }
        const next = prependNotification(prev, notification);
        nextUnread = resolveUnreadCountWithServiceWorkerHint(next, serviceWorkerUnreadCount);
        setUnreadCount(nextUnread);
        saveStoredNotifications(next);
        void mirrorNotificationsToIdb(next);
        return next;
      });

      if (alreadyExists) return;

      void syncAppBadge(nextUnread);
      dispatchInventoryNotificationEvent(nextUnread);

      const currentPrefs = prefsRef.current;
      if (!currentPrefs.enabled || !currentPrefs.systemNotifications) return;
      if (options?.skipSystemNotification) return;
      if (getNotificationPermissionState() !== 'granted') return;

      const loc = localeRef.current;
      const isTh = loc === 'th';
      const inventoryPath = `/${loc}/inventory`;

      void showSystemNotification(notification.title, notification.summary, {
        tag: notification.logId,
        url: notification.entityId
          ? `${inventoryPath}?highlight=${notification.entityId}`
          : inventoryPath,
        unreadCount: nextUnread,
        isTh,
      });
    },
    []
  );

  const filterEligibleRows = useCallback((rows: DataChangeLogRow[]) => {
    const currentPrefs = prefsRef.current;
    const sessionId = sessionIdRef.current;

    return rows.filter((row) => {
      if (!isEligibleInventoryNotification(row)) return false;
      if (!shouldNotifyForAction(currentPrefs, row.action as DataChangeAction)) return false;
      if (!currentPrefs.notifyOwnChanges && isOwnChange(row.metadata, sessionId)) return false;
      return true;
    });
  }, []);

  const processRows = useCallback(
    (rows: DataChangeLogRow[]) => {
      const loc = localeRef.current;
      const eligible = filterEligibleRows(rows);

      if (eligible.length === 0) return;

      const notification =
        eligible.length > 1
          ? formatBatchedNotificationFromRows(eligible, loc)
          : formatInventoryNotification(eligible[eligible.length - 1], loc);

      pushNotification(notification);
    },
    [filterEligibleRows, pushNotification]
  );

  const syncInventoryNotificationCatchUp = useCallback(async () => {
    const result = await fetchDataChangeLogs({ module: 'inventory', limit: 50 });
    if (!result.success) return;

    const eligible = filterEligibleRows(result.rows);
    if (eligible.length === 0) return;

    const loc = localeRef.current;
    for (const row of [...eligible].reverse()) {
      pushNotification(formatInventoryNotification(row, loc), undefined, {
        skipSystemNotification: true,
      });
    }
  }, [filterEligibleRows, pushNotification]);

  const syncFromStorageAndServer = useCallback(async (writeBack = true) => {
    await syncFromStorage(writeBack);
    await syncInventoryNotificationCatchUp();
  }, [syncFromStorage, syncInventoryNotificationCatchUp]);

  const syncFromServerOnly = useCallback(() => {
    void syncInventoryNotificationCatchUp();
  }, [syncInventoryNotificationCatchUp]);

  const syncFromStorageAndServerSoon = useCallback(
    (writeBack = true) => {
      void syncFromStorageAndServer(writeBack);
    },
    [syncFromStorageAndServer],
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
            syncFromServerOnly();
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
              '[inventory notifications] Realtime unavailable — apply pending migrations from supabase/migrations/ via Supabase CLI or dashboard if not applied',
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
  }, [processRows, syncFromServerOnly]);

  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === 'visible') {
        syncFromStorageAndServerSoon();
      }
    };

    const cleanupCrossTab = subscribeNotificationSync(() => {
      syncFromStorageAndServerSoon(false);
    });

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);

    return () => {
      cleanupCrossTab();
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
    };
  }, [syncFromStorageAndServerSoon]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;

    const onSwMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        notification?: InventoryNotification;
        unreadCount?: number;
        systemNotificationShown?: boolean;
      } | null;
      if (data?.type !== SW_INVENTORY_PUSH_RECEIVED || !data.notification) return;
      pushNotification(data.notification, data.unreadCount, {
        skipSystemNotification: data.systemNotificationShown === true,
      });
      syncFromStorageAndServerSoon(false);
    };

    navigator.serviceWorker.addEventListener('message', onSwMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', onSwMessage);
    };
  }, [pushNotification, syncFromStorageAndServerSoon]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      setUnreadCount(0);
      saveStoredNotifications(next);
      void mirrorNotificationsToIdb(next);
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
      void mirrorNotificationsToIdb(next);
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
