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
  refresh: () => Promise<InventoryRealtimeItem[]>;
  isLoading: boolean;
  hasLoaded: boolean;
  subscribe: (callback: InventoryChangeCallback) => () => void;
}

const InventoryRealtimeContext = createContext<InventoryRealtimeContextValue | null>(null);

export function InventoryRealtimeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryRealtimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const subscribersRef = useRef<Set<InventoryChangeCallback>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const startChannelPromiseRef = useRef<Promise<void> | null>(null);

  const notifySubscribers = useCallback((payload: InventoryChangePayload) => {
    subscribersRef.current.forEach((cb) => cb(payload));
  }, []);

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

  const stopRealtimeChannel = useCallback(() => {
    const channel = channelRef.current;
    channelRef.current = null;

    if (channel && typeof supabase.removeChannel === 'function') {
      void supabase.removeChannel(channel);
    }
  }, []);

  const startRealtimeChannel = useCallback(() => {
    if (typeof supabase.channel !== 'function') {
      return;
    }

    if (channelRef.current || startChannelPromiseRef.current) {
      return;
    }

    startChannelPromiseRef.current = (async () => {
      await ensureSupabaseSession();
      if (subscribersRef.current.size === 0 || typeof supabase.channel !== 'function') return;

      channelRef.current = supabase
        .channel('inventory_items_shared')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventory_items' },
          (payload) => {
            const typedPayload = payload as InventoryChangePayload;
            applyPayloadToItems(typedPayload);
            notifySubscribers(typedPayload);
          },
        )
        .subscribe();
    })()
      .catch((error) => {
        console.error('[inventory realtime] Failed to start channel:', error);
      })
      .finally(() => {
        startChannelPromiseRef.current = null;
        if (subscribersRef.current.size === 0) {
          stopRealtimeChannel();
        }
      });
  }, [applyPayloadToItems, notifySubscribers, stopRealtimeChannel]);

  useEffect(() => {
    return () => {
      stopRealtimeChannel();
    };
  }, [stopRealtimeChannel]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  const subscribe = useCallback((callback: InventoryChangeCallback) => {
    subscribersRef.current.add(callback);
    startRealtimeChannel();

    return () => {
      subscribersRef.current.delete(callback);
      if (subscribersRef.current.size === 0) {
        stopRealtimeChannel();
      }
    };
  }, [startRealtimeChannel, stopRealtimeChannel]);

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
