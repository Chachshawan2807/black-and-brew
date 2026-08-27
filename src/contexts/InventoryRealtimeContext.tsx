'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import {
  scheduleSupabaseChannelTeardown,
  findSupabaseChannelByName,
  isSupabaseChannelReusable,
  prepareSupabaseChannelName,
} from '@/lib/supabase-realtime-channel';
import { mergeInventoryRealtimeUpdate, type InventoryStockFields } from '@/lib/inventory-stock';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';

export type InventoryRealtimeItem = InventoryStockFields & {
  id: string;
  name: string;
  stock: number;
  order_qty?: number;
  order_point?: number;
  target_stock: number;
  unit: string;
  source: string;
  sort_order: number;
};

type InventoryChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;
type InventoryChangeCallback = (payload: InventoryChangePayload) => void;

interface InventoryRealtimeContextValue {
  items: InventoryRealtimeItem[];
  setItems: Dispatch<SetStateAction<InventoryRealtimeItem[]>>;
  refresh: (options?: { soft?: boolean }) => Promise<InventoryRealtimeItem[]>;
  isLoading: boolean;
  hasLoaded: boolean;
  subscribe: (callback: InventoryChangeCallback) => () => void;
}

const InventoryRealtimeContext = createContext<InventoryRealtimeContextValue | null>(null);

const INVENTORY_SHARED_CHANNEL_NAME = 'inventory_items_shared';

const inventoryListeners = new Set<InventoryChangeCallback>();
let applyInventoryPayload: ((payload: InventoryChangePayload) => void) | null = null;
let sharedInventoryChannel: ReturnType<typeof supabase.channel> | null = null;
let inventorySubscriberCount = 0;
let inventoryChannelStarting: Promise<void> | null = null;
let inventoryTeardownCancel: (() => void) | null = null;

function cancelSharedInventoryChannelTeardown() {
  inventoryTeardownCancel?.();
  inventoryTeardownCancel = null;
}

function dispatchInventoryPayload(payload: InventoryChangePayload) {
  applyInventoryPayload?.(payload);
  inventoryListeners.forEach((listener) => listener(payload));
}

async function ensureSharedInventoryChannel() {
  cancelSharedInventoryChannelTeardown();

  const existing = findSupabaseChannelByName(INVENTORY_SHARED_CHANNEL_NAME);
  if (existing && isSupabaseChannelReusable(existing)) {
    sharedInventoryChannel = existing;
    return;
  }

  if (sharedInventoryChannel) return;
  if (inventoryChannelStarting) {
    await inventoryChannelStarting;
    return;
  }

  inventoryChannelStarting = (async () => {
    await ensureSupabaseSession();
    if (inventorySubscriberCount === 0 || typeof supabase.channel !== 'function') return;

    const prepared = await prepareSupabaseChannelName(INVENTORY_SHARED_CHANNEL_NAME);
    if (inventorySubscriberCount === 0) return;

    if (prepared.reused) {
      sharedInventoryChannel = prepared.reused;
      return;
    }

    sharedInventoryChannel = supabase
      .channel(INVENTORY_SHARED_CHANNEL_NAME)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        (payload) => {
          dispatchInventoryPayload(payload as InventoryChangePayload);
        },
      )
      .subscribe();
  })();

  try {
    await inventoryChannelStarting;
  } catch (error) {
    console.error('[inventory realtime] Failed to start channel:', error);
  } finally {
    inventoryChannelStarting = null;
    if (inventorySubscriberCount === 0) {
      teardownSharedInventoryChannel();
    }
  }
}

function teardownSharedInventoryChannel() {
  if (inventorySubscriberCount > 0 || !sharedInventoryChannel) return;

  cancelSharedInventoryChannelTeardown();
  const activeChannel = sharedInventoryChannel;
  inventoryTeardownCancel = scheduleSupabaseChannelTeardown(activeChannel, {
    shouldTeardown: () => inventorySubscriberCount === 0 && sharedInventoryChannel === activeChannel,
  });
  sharedInventoryChannel = null;
}

export function InventoryRealtimeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryRealtimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const applyPayloadToItems = useCallback((payload: InventoryChangePayload) => {
    if (payload.eventType === 'INSERT') {
      setItems((prev) => {
        if (prev.find((i) => i.id === payload.new.id)) return prev;
        return [...prev, payload.new as InventoryRealtimeItem];
      });
    } else if (payload.eventType === 'UPDATE') {
      setItems((prev) =>
        prev.map((item) =>
          item.id === payload.new.id
            ? mergeInventoryRealtimeUpdate(item, payload.new as InventoryRealtimeItem)
            : item,
        ),
      );
    } else if (payload.eventType === 'DELETE') {
      setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
    }
  }, []);

  const applyPayloadRef = useRef(applyPayloadToItems);
  useEffect(() => {
    applyPayloadRef.current = applyPayloadToItems;
  }, [applyPayloadToItems]);

  useEffect(() => {
    applyInventoryPayload = (payload) => {
      applyPayloadRef.current(payload);
    };

    return () => {
      if (applyInventoryPayload) {
        applyInventoryPayload = null;
      }
    };
  }, []);

  const refresh = useCallback(async (options?: { soft?: boolean }) => {
    const soft = options?.soft === true;
    if (!soft) setIsLoading(true);
    try {
      await ensureSupabaseSession();
      const { data, error } = await supabase
        .from('inventory_items')
        .select(INVENTORY_ITEM_SELECT)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Supabase Error:', error.message, error.details);
        throw error;
      }

      const loaded = (data as InventoryRealtimeItem[]) || [];
      setItems(loaded);
      setHasLoaded(true);
      return loaded;
    } catch (err) {
      console.error('Failed to fetch inventory items:', err);
      return [];
    } finally {
      if (!soft) setIsLoading(false);
    }
  }, []);

  const subscribe = useCallback((callback: InventoryChangeCallback) => {
    inventoryListeners.add(callback);
    inventorySubscriberCount += 1;
    void ensureSharedInventoryChannel();

    return () => {
      inventoryListeners.delete(callback);
      inventorySubscriberCount = Math.max(0, inventorySubscriberCount - 1);
      teardownSharedInventoryChannel();
    };
  }, []);

  return (
    <InventoryRealtimeContext.Provider
      value={{ items, setItems, refresh, isLoading, hasLoaded, subscribe }}
    >
      {children}
    </InventoryRealtimeContext.Provider>
  );
}

export function useInventoryRealtime() {
  const ctx = useContext(InventoryRealtimeContext);
  if (!ctx) {
    throw new Error('useInventoryRealtime must be used within InventoryRealtimeProvider');
  }
  return ctx;
}

/** @internal Test-only introspection for shared inventory channel lifecycle. */
export function __getInventoryRealtimeStateForTests() {
  if (process.env.VITEST !== 'true') {
    throw new Error('__getInventoryRealtimeStateForTests is only available under Vitest');
  }

  return {
    listenerCount: inventoryListeners.size,
    subscriberCount: inventorySubscriberCount,
    hasChannel: sharedInventoryChannel !== null,
  };
}
