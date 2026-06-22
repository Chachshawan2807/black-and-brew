'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type FloatingOverlayId = 'notification' | 'quick-action' | 'ai-chat';

const FAB_STACK_HIDDEN_KEY = 'bb-fab-stack-hidden';

type FloatingOverlayContextValue = {
  isOpen: (id: FloatingOverlayId) => boolean;
  isAnyOtherOpen: (id: FloatingOverlayId) => boolean;
  setOverlayOpen: (id: FloatingOverlayId, open: boolean) => void;
  fabStackHidden: boolean;
  toggleFabStackHidden: () => void;
  /** Temporarily hide the FAB stack while a full-screen overlay owns the viewport. */
  fabStackSuppressed: boolean;
  setFabStackSuppressed: (suppressed: boolean) => void;
};

const FloatingOverlayContext = createContext<FloatingOverlayContextValue | null>(null);

function getInitialFabStackHidden() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(FAB_STACK_HIDDEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function FloatingOverlayProvider({ children }: { children: ReactNode }) {
  const [openMap, setOpenMap] = useState<Record<FloatingOverlayId, boolean>>({
    notification: false,
    'quick-action': false,
    'ai-chat': false,
  });
  const [fabStackHidden, setFabStackHidden] = useState(getInitialFabStackHidden);
  const [fabStackSuppressed, setFabStackSuppressed] = useState(false);

  const setOverlayOpen = useCallback((id: FloatingOverlayId, open: boolean) => {
    setOpenMap((prev) => (prev[id] === open ? prev : { ...prev, [id]: open }));
  }, []);

  const toggleFabStackHidden = useCallback(() => {
    setFabStackHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(FAB_STACK_HIDDEN_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const value = useMemo<FloatingOverlayContextValue>(
    () => ({
      isOpen: (id) => openMap[id],
      isAnyOtherOpen: (id) =>
        (Object.entries(openMap) as [FloatingOverlayId, boolean][]).some(
          ([key, open]) => key !== id && open
        ),
      setOverlayOpen,
      fabStackHidden,
      toggleFabStackHidden,
      fabStackSuppressed,
      setFabStackSuppressed,
    }),
    [openMap, setOverlayOpen, fabStackHidden, toggleFabStackHidden, fabStackSuppressed]
  );

  return (
    <FloatingOverlayContext.Provider value={value}>{children}</FloatingOverlayContext.Provider>
  );
}

export function useFloatingOverlay() {
  const ctx = useContext(FloatingOverlayContext);
  if (!ctx) {
    throw new Error('useFloatingOverlay must be used within FloatingOverlayProvider');
  }
  return ctx;
}
