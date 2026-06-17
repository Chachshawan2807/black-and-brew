import { cn } from '@/lib/utils';

/**
 * Shared bottom-right FAB stack (bottom → top): Hide toggle → AI Chat → Quick Action → Notifications.
 * Main buttons: 2.75rem (w-11). Hide toggle: 2rem (w-8). Gap between layers: 0.75rem.
 * Edge inset: 1.25rem mobile / 1.5rem desktop.
 *
 * Mobile bottoms: Hide 1.25rem | AI 4rem | Quick 7.5rem | Notify 11rem | Panel 14.5rem
 * Desktop bottoms: Hide 1.5rem | AI 4.25rem | Quick 7.75rem | Notify 11.25rem | Panel 14.75rem
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

export const FAB_BOTTOM_AI_CLASS =
  'max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-[4.25rem]';

export const FAB_BOTTOM_QUICK_ACTION_CLASS =
  'max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:bottom-[7.75rem]';

export const FAB_BOTTOM_NOTIFICATION_CLASS =
  'max-md:bottom-[calc(11rem+env(safe-area-inset-bottom,0px))] md:bottom-[11.25rem]';

export const FAB_PANEL_ABOVE_AI_CLASS =
  'max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-[4.25rem]';

/** Chat panel when AI FAB close button stays visible below the window */
export const FAB_PANEL_CLEAR_OF_AI_CLASS =
  'max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:bottom-[7.75rem]';

export const FAB_PANEL_ABOVE_NOTIFICATION_CLASS =
  'max-md:bottom-[calc(14.5rem+env(safe-area-inset-bottom,0px))] md:bottom-[14.75rem]';

/** Page/content bottom inset to clear the full three-button stack + hide toggle */
export const FAB_PAGE_BOTTOM_PADDING_CLASS =
  'max-md:pb-[calc(15rem+env(safe-area-inset-bottom,0px))]';

/** Page/content bottom inset when only the hide toggle is visible */
export const FAB_PAGE_BOTTOM_PADDING_HIDDEN_CLASS =
  'max-md:pb-[calc(4rem+env(safe-area-inset-bottom,0px))]';
