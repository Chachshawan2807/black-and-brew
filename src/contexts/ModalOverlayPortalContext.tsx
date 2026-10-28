'use client';

import { createContext, use, type ReactNode, type RefObject } from 'react';

type ModalOverlayPortalContextValue = RefObject<HTMLDialogElement | null> | null;

const ModalOverlayPortalContext = createContext<ModalOverlayPortalContextValue>(null);

type ModalOverlayPortalProviderProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  children: ReactNode;
};

/** Supplies the open modal dialog element for portaled pickers (avoids document inert subtree). */
export function ModalOverlayPortalProvider({
  dialogRef,
  open,
  children,
}: ModalOverlayPortalProviderProps) {
  return (
    <ModalOverlayPortalContext value={open ? dialogRef : null}>
      {children}
    </ModalOverlayPortalContext>
  );
}

export function useModalOverlayPortalHostRef(): ModalOverlayPortalContextValue {
  return use(ModalOverlayPortalContext);
}
