'use client';

import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSidebarMenuOrder, saveSidebarMenuOrder } from '@/app/actions/app-preferences-actions';
import { useSidebarMenuOrder } from '@/hooks/use-sidebar-menu-order';
import { SIDEBAR_MENU_ORDER_KEY, parseSidebarMenuOrder } from '@/lib/sidebar-menu-order';
import {
  SIDEBAR_MENU_ORDER_SYNC_EVENT,
  areSidebarMenuOrdersEqual,
  broadcastSidebarMenuOrderChange,
  resolveInitialSidebarMenuOrder,
  shouldApplyRemoteSidebarMenuOrder,
} from '@/lib/sidebar-menu-order-sync';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { supabase } from '@/lib/supabase';
import { scheduleSupabaseChannelTeardown } from '@/lib/supabase-realtime-channel';

type AppPreferencesRow = {
  branch_id: string;
  sidebar_menu_order: string[] | null;
  updated_at: string | null;
};

function resolveBranchId(): string {
  return process.env.NEXT_PUBLIC_STORE_BRANCH_ID?.trim() || 'main';
}

function parseRealtimeRow(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const row = (payload.new ?? payload.old) as AppPreferencesRow | undefined;
  if (!row || row.branch_id !== resolveBranchId()) return null;

  const orderIds = Array.isArray(row.sidebar_menu_order)
    ? parseSidebarMenuOrder(JSON.stringify(row.sidebar_menu_order))
    : null;

  return {
    orderIds,
    updatedAt: row.updated_at ?? null,
  };
}

export function SidebarMenuOrderSync() {
  const orderIds = useSidebarMenuOrder((state) => state.orderIds);
  const setOrderIds = useSidebarMenuOrder((state) => state.setOrderIds);
  const hydratedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const lastAppliedUpdatedAtRef = useRef<string | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      const localOrderIds = parseSidebarMenuOrder(localStorage.getItem(SIDEBAR_MENU_ORDER_KEY));
      const result = await getSidebarMenuOrder();
      if (cancelled || !result.success) return;

      const resolved = resolveInitialSidebarMenuOrder({
        localOrderIds,
        serverOrderIds: result.orderIds,
      });

      skipNextSaveRef.current = true;
      setOrderIds(resolved.orderIds);
      lastAppliedUpdatedAtRef.current = result.updatedAt;
      lastSavedSignatureRef.current = resolved.orderIds?.join('|') ?? null;
      broadcastSidebarMenuOrderChange(resolved.orderIds);
      hydratedRef.current = true;

      if (resolved.shouldPushLocalToServer && resolved.orderIds?.length) {
        const saveResult = await saveSidebarMenuOrder(resolved.orderIds);
        if (!cancelled && saveResult.success) {
          lastAppliedUpdatedAtRef.current = saveResult.updatedAt;
        }
      }
    };

    void hydrateFromServer();

    return () => {
      cancelled = true;
    };
  }, [setOrderIds]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const signature = orderIds?.join('|') ?? '';
    if (signature === lastSavedSignatureRef.current) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (!orderIds?.length) return;
        const result = await saveSidebarMenuOrder(orderIds);
        if (cancelled || !result.success) return;
        lastSavedSignatureRef.current = signature;
        lastAppliedUpdatedAtRef.current = result.updatedAt;
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [orderIds]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let teardownCancel: (() => void) | null = null;

    const stopChannel = () => {
      if (!channel) return;
      const activeChannel = channel;
      channel = null;
      teardownCancel?.();
      teardownCancel = scheduleSupabaseChannelTeardown(activeChannel, {
        shouldTeardown: () => channel === null,
      });
    };

    const subscribe = async () => {
      teardownCancel?.();
      teardownCancel = null;

      await ensureSupabaseSession();
      if (cancelled) return;

      const branchId = resolveBranchId();
      const channelName = `sidebar_menu_order_${branchId}`;
      const topic = `realtime:${channelName}`;

      for (const existing of supabase.getChannels()) {
        if (existing.topic === topic) {
          await supabase.removeChannel(existing);
          if (cancelled) return;
        }
      }

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'app_preferences',
            filter: `branch_id=eq.${branchId}`,
          },
          (payload) => {
            const remote = parseRealtimeRow(payload);
            if (!remote) return;

            const currentOrderIds = useSidebarMenuOrder.getState().orderIds;
            if (
              !shouldApplyRemoteSidebarMenuOrder({
                currentOrderIds,
                remoteOrderIds: remote.orderIds,
                remoteUpdatedAt: remote.updatedAt,
                lastAppliedUpdatedAt: lastAppliedUpdatedAtRef.current,
              })
            ) {
              return;
            }

            skipNextSaveRef.current = true;
            setOrderIds(remote.orderIds);
            lastAppliedUpdatedAtRef.current = remote.updatedAt;
            lastSavedSignatureRef.current = remote.orderIds?.join('|') ?? null;
            broadcastSidebarMenuOrderChange(remote.orderIds);
          },
        )
        .subscribe();

      if (cancelled) {
        stopChannel();
      }
    };

    void subscribe();

    return () => {
      cancelled = true;
      teardownCancel?.();
      teardownCancel = null;
      stopChannel();
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SIDEBAR_MENU_ORDER_KEY) return;
      const orderIds = parseSidebarMenuOrder(event.newValue);
      skipNextSaveRef.current = true;
      setOrderIds(orderIds);
      lastSavedSignatureRef.current = orderIds?.join('|') ?? null;
    };

    const onCustomSync = (event: Event) => {
      const detail = (event as CustomEvent<{ orderIds: string[] | null }>).detail;
      if (!detail) return;
      if (areSidebarMenuOrdersEqual(useSidebarMenuOrder.getState().orderIds, detail.orderIds)) {
        return;
      }
      skipNextSaveRef.current = true;
      setOrderIds(detail.orderIds);
      lastSavedSignatureRef.current = detail.orderIds?.join('|') ?? null;
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(SIDEBAR_MENU_ORDER_SYNC_EVENT, onCustomSync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SIDEBAR_MENU_ORDER_SYNC_EVENT, onCustomSync);
    };
  }, [setOrderIds]);

  return null;
}
