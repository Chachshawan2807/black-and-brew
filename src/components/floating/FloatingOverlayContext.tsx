'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  /** Temporarily hide FAB stack (e.g. full-page refresh overlay on Market Insights). */
  fabStackSuppressed: boolean;
  setFabStackSuppressed: (suppressed: boolean) => void;
};

const FloatingOverlayContext = createContext<FloatingOverlayContextValue | null>(null);

export function FloatingOverlayProvider({ children }: { children: ReactNode }) {
  const [openMap, setOpenMap] = useState<Record<FloatingOverlayId, boolean>>({
    notification: false,
    'quick-action': false,
    'ai-chat': false,
  });
  const [fabStackHidden, setFabStackHidden] = useState(false);
  const [fabStackSuppressed, setFabStackSuppressed] = useState(false);

  useEffect(() => {
    try {
      setFabStackHidden(localStorage.getItem(FAB_STACK_HIDDEN_KEY) === 'true');
    } catch {
      // ignore storage errors
    }
  }, []);

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
