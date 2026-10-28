import type { RefObject } from 'react';

/**
 * Target for portaled pickers (select listbox, date popover).
 * Modal showModal() inerts document.body; prefer the open bb-modal-dialog host.
 */
export function resolveOverlayPortalContainer(
  triggerEl: HTMLElement | null | undefined,
  modalHostRef: RefObject<HTMLDialogElement | null> | null,
): HTMLElement {
  if (typeof document === 'undefined') {
    return null as unknown as HTMLElement;
  }

  const hostFromContext = modalHostRef?.current;
  if (hostFromContext instanceof HTMLDialogElement && hostFromContext.open) {
    return hostFromContext;
  }

  if (triggerEl) {
    const fromTrigger = triggerEl.closest('dialog.bb-modal-dialog');
    if (fromTrigger instanceof HTMLDialogElement && fromTrigger.open) {
      return fromTrigger;
    }
  }

  const modals = document.querySelectorAll('dialog.bb-modal-dialog');
  for (let i = modals.length - 1; i >= 0; i -= 1) {
    const node = modals[i];
    if (node instanceof HTMLDialogElement && node.open) {
      return node;
    }
  }

  return document.body;
}

/** @deprecated Prefer resolveOverlayPortalContainer with modal host ref */
export function getOverlayPortalContainer(): HTMLElement {
  return resolveOverlayPortalContainer(null, null);
}

export function supportsPopoverTopLayer(): boolean {
  return (
    typeof HTMLElement !== 'undefined'
    && typeof HTMLElement.prototype.showPopover === 'function'
  );
}

export function isOpenModalDialogHost(element: HTMLElement): boolean {
  return (
    element instanceof HTMLDialogElement
    && element.classList.contains('bb-modal-dialog')
    && element.open
  );
}

/** Popover top layer on body only; inside showModal() dialog it breaks wheel/touch scroll on pickers. */
export function shouldElevatePickerWithPopoverTopLayer(portalContainer: HTMLElement): boolean {
  return supportsPopoverTopLayer() && !isOpenModalDialogHost(portalContainer);
}
