/**
 * Target for portaled pickers (select listbox, date popover).
 * When a modal `<dialog>` is open, body descendants are inert; portal into the dialog instead.
 */
export function getOverlayPortalContainer(): HTMLElement {
  if (typeof document === 'undefined') {
    return null as unknown as HTMLElement;
  }

  const modals = document.querySelectorAll('dialog.bb-modal-dialog:modal');
  if (modals.length > 0) {
    return modals[modals.length - 1] as HTMLElement;
  }

  return document.body;
}
