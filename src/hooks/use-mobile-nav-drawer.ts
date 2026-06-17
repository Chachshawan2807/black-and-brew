'use client';

import { create } from 'zustand';

export type MobileNavDrawerActions = {
  open: () => void;
  close: () => void;
};

interface MobileNavDrawerStore {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  actions: MobileNavDrawerActions | null;
  registerActions: (actions: MobileNavDrawerActions | null) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useMobileNavDrawer = create<MobileNavDrawerStore>((set, get) => ({
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  actions: null,
  registerActions: (actions) => set({ actions }),
  openDrawer: () => get().actions?.open(),
  closeDrawer: () => get().actions?.close(),
}));
