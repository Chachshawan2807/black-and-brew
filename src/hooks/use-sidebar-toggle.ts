"use client";

import { useEffect, useState } from 'react';
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

/** Wait for zustand persist rehydration before reading sidebar open state from localStorage. */
export function useSidebarHydrated() {
  const [hydrated, setHydrated] = useState(() => useSidebarToggle.persist.hasHydrated());

  useEffect(() => {
    if (useSidebarToggle.persist.hasHydrated()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
      setHydrated(true);
      return;
    }
    return useSidebarToggle.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
