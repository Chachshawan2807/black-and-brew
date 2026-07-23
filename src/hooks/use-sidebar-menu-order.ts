'use client';

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  SIDEBAR_MENU_ORDER_KEY,
  parseSidebarMenuOrder,
} from '@/lib/sidebar-menu-order';

interface SidebarMenuOrderStore {
  orderIds: string[] | null;
  setOrderIds: (orderIds: string[] | null) => void;
}

const sidebarMenuOrderStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    const orderIds = parseSidebarMenuOrder(localStorage.getItem(name));
    if (!orderIds) return null;
    return JSON.stringify({ state: { orderIds }, version: 0 });
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value) as { state?: { orderIds?: string[] | null } };
      const orderIds = parsed.state?.orderIds;
      if (Array.isArray(orderIds)) {
        localStorage.setItem(name, JSON.stringify(orderIds));
        return;
      }
      if (orderIds === null) {
        localStorage.removeItem(name);
      }
    } catch {
      // ignore malformed writes
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

export const useSidebarMenuOrder = create(
  persist<SidebarMenuOrderStore>(
    (set) => ({
      orderIds: null,
      setOrderIds: (orderIds) => set({ orderIds }),
    }),
    {
      name: SIDEBAR_MENU_ORDER_KEY,
      storage: createJSONStorage(() => sidebarMenuOrderStorage),
      partialize: (state) => ({ orderIds: state.orderIds }),
    },
  ),
);

function syncOrderFromStorage(raw: string | null) {
  const orderIds = parseSidebarMenuOrder(raw);
  useSidebarMenuOrder.setState({ orderIds });
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== SIDEBAR_MENU_ORDER_KEY) return;
    syncOrderFromStorage(event.newValue);
  });
}
