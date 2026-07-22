'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalPortalProps = {
  children: ReactNode;
};

/** Renders modals on document.body so they sit above FAB/nav overlays and escape main layout containment. */
export function ModalPortal({ children }: ModalPortalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return createPortal(children, document.body);
}
