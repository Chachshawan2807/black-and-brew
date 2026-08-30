import { cn } from '@/lib/utils';

/**
 * Shared bottom-right FAB stack (bottom → top): Hide toggle → Quick Action → Notifications.
 * Main buttons: 2.75rem (w-11). Hide toggle: 2rem (w-8). Gap between layers: 0.75rem.
 * Edge inset: 1.25rem mobile / 1.5rem desktop.
 *
 * Mobile bottoms: Hide 1.25rem | Quick 4rem | Notify 7.5rem
 * Desktop bottoms: Hide 1.5rem | Quick 4.25rem | Notify 7.75rem | Panel 11.25rem
 * Mobile quick-action panel: vertically centered (see FAB_PANEL_CENTERED_MOBILE_WRAPPER_CLASS)
 */

export const FAB_SIZE_CLASS = 'w-11 h-11';

export const FAB_HIDE_TOGGLE_SIZE_CLASS = 'w-8 h-8';

export const FAB_RIGHT_CLASS =
  'max-md:right-[calc(1.25rem+env(safe-area-inset-right,0px))] md:right-6';

export const FAB_BASE_CLASS = cn(
  'fixed rounded-full bg-[#000000] text-white flex items-center justify-center shadow-lg',
  FAB_SIZE_CLASS,
  FAB_RIGHT_CLASS,
);

/** Inner trigger styling when wrapped by FabFadePresence (position on parent) */
export const FAB_STACK_INNER_CLASS = cn(
  'rounded-full bg-[#000000] text-white flex items-center justify-center shadow-lg',
  FAB_SIZE_CLASS,
);

export const FAB_BOTTOM_HIDE_TOGGLE_CLASS =
  'max-md:bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6';

export const FAB_BOTTOM_QUICK_ACTION_CLASS =
  'max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-[4.25rem]';

export const FAB_BOTTOM_NOTIFICATION_CLASS =
  'max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:bottom-[7.75rem]';

/** Desktop-only bottom anchor for the inventory quick-action FAB panel */
export const FAB_PANEL_ABOVE_NOTIFICATION_CLASS = 'md:bottom-[11.25rem]';

/** Mobile quick-action panel flex center so height changes stay vertically balanced */
export const FAB_PANEL_CENTERED_MOBILE_WRAPPER_CLASS =
  'max-md:flex max-md:items-center max-md:justify-center max-md:pointer-events-none max-md:p-4';

/** Cap FAB panel height on phone literal string required for Tailwind JIT */
export const FAB_MOBILE_PANEL_MAX_HEIGHT_CLASS =
  'max-md:max-h-[min(75dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))]';

/**
 * FAB bulk queue list scroll cap on phone panel shrink-wraps to content; list scrolls when taller.
 * Literal string required for Tailwind JIT (no template interpolation).
 */
export const FAB_MOBILE_BULK_QUEUE_LIST_MAX_HEIGHT_CLASS =
  'max-h-[min(50dvh,calc(75dvh-14rem))]';

/** Page/content bottom inset to clear the two-button stack + hide toggle */
export const FAB_PAGE_BOTTOM_PADDING_CLASS =
  'max-md:pb-[calc(11rem+env(safe-area-inset-bottom,0px))]';

/** Page/content bottom inset when only the hide toggle is visible */
export const FAB_PAGE_BOTTOM_PADDING_HIDDEN_CLASS =
  'max-md:pb-[calc(4rem+env(safe-area-inset-bottom,0px))]';

/** App modals that must cover the FAB stack (hide toggle z-199, buttons z-201). */
export const APP_MODAL_ABOVE_FAB_Z_INDEX = 220;

/** Inventory modals from quick action (inline bar or FAB) above FAB panel (z-199) and FAB buttons (z-201). */
export const INVENTORY_MODAL_Z_CLASS = 'z-[220]';

/** Portaled RoundedSelect listbox above modals, below tooltips and export overlay. */
export const SELECT_LISTBOX_Z_CLASS = 'z-[245]';

/** Image export / save progress above every app overlay (modals, FAB, tooltips). */
export const EXPORT_PROGRESS_OVERLAY_Z_CLASS = 'z-[260]';
