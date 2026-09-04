/** Shared centered modal placement for secretary task overlays. */
export const SECRETARY_MODAL_LAYOUT_CLASS = 'items-center justify-center p-4 min-w-0 w-full';

/** Mobile-safe centered shell: scroll when tall, keyboard-aware repositioning. */
export const SECRETARY_MODAL_SCAFFOLD_PROPS = {
  centerScrollable: true,
  keyboardAware: true,
} as const;

/** Consistent backdrop blur for all secretary task overlays. */
export const SECRETARY_MODAL_OVERLAY_CLASS = 'bg-black/20 backdrop-blur-md';

/** Max height for secretary panel chrome (svh + keyboard-safe dvh). */
export const SECRETARY_PANEL_MAX_HEIGHT = 'max-h-[min(85svh,calc(100dvh-2rem))]';
