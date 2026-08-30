/** Shared centered modal placement for secretary task overlays. */
export const SECRETARY_MODAL_LAYOUT_CLASS = 'items-center justify-center p-4 min-w-0 w-full';

/** Mobile-safe centered shell: scroll when tall, keyboard-aware repositioning. */
export const SECRETARY_MODAL_SCAFFOLD_PROPS = {
  centerScrollable: true,
  keyboardAware: true,
} as const;
