"use client";

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SidebarToggleStore {
  isOpen: boolean;
  setIsOpen: () => void;
}

export const useSidebarToggle = create(
  persist<SidebarToggleStore>(
    (set, get) => ({
      isOpen: true,
      setIsOpen: () => {
        set({ isOpen: !get().isOpen });
      }
    }),
    {
      name: 'sidebarOpen',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

function subscribeSidebarHydrated(onStoreChange: () => void) {
  const persistApi = useSidebarToggle.persist;
  if (!persistApi) {
    queueMicrotask(onStoreChange);
    return () => {};
  }
  if (persistApi.hasHydrated()) {
    return () => {};
  }
  return persistApi.onFinishHydration(onStoreChange);
}

function getSidebarHydratedSnapshot() {
  const persistApi = useSidebarToggle.persist;
  if (!persistApi) return true;
  return persistApi.hasHydrated();
}

/** Wait for zustand persist rehydration before reading sidebar open state from localStorage. */
export function useSidebarHydrated() {
  return useSyncExternalStore(
    subscribeSidebarHydrated,
    getSidebarHydratedSnapshot,
    () => false,
  );
}
