export const SIDEBAR_MENU_ORDER_SAVE_FAILED_EVENT = 'bb:sidebar-menu-order-save-failed';

export function broadcastSidebarMenuOrderSaveFailed(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SIDEBAR_MENU_ORDER_SAVE_FAILED_EVENT, { detail: { message } }),
  );
}
