'use client';

import { createContext, useContext, type ReactNode } from 'react';

const ModalOverlayPortalContext = createContext<HTMLElement | null>(null);

/** When inside FadeModalScaffold (native dialog top layer), portaled overlays must mount on the dialog node. */
export function ModalOverlayPortalProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <ModalOverlayPortalContext.Provider value={container}>
      {children}
    </ModalOverlayPortalContext.Provider>
  );
}

export function useOverlayPortalContainer(): HTMLElement | null {
  const modalContainer = useContext(ModalOverlayPortalContext);
  if (typeof document === 'undefined') return null;
  return modalContainer ?? document.body;
}
