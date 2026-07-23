export const SIDEBAR_MENU_ORDER_SYNC_EVENT = 'bb-sidebar-menu-order-changed';

export function areSidebarMenuOrdersEqual(
  left: string[] | null | undefined,
  right: string[] | null | undefined,
): boolean {
  const normalizedLeft = left?.length ? left : null;
  const normalizedRight = right?.length ? right : null;

  if (normalizedLeft === null && normalizedRight === null) return true;
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft.length !== normalizedRight.length) return false;

  return normalizedLeft.every((id, index) => id === normalizedRight[index]);
}

export function resolveInitialSidebarMenuOrder({
  localOrderIds,
  serverOrderIds,
}: {
  localOrderIds: string[] | null;
  serverOrderIds: string[] | null;
}): { orderIds: string[] | null; shouldPushLocalToServer: boolean } {
  if (serverOrderIds?.length) {
    return { orderIds: serverOrderIds, shouldPushLocalToServer: false };
  }

  if (localOrderIds?.length) {
    return { orderIds: localOrderIds, shouldPushLocalToServer: true };
  }

  return { orderIds: null, shouldPushLocalToServer: false };
}

export function shouldApplyRemoteSidebarMenuOrder({
  currentOrderIds,
  remoteOrderIds,
  remoteUpdatedAt,
  lastAppliedUpdatedAt,
}: {
  currentOrderIds: string[] | null;
  remoteOrderIds: string[] | null;
  remoteUpdatedAt: string | null;
  lastAppliedUpdatedAt: string | null;
}): boolean {
  if (!remoteOrderIds?.length) return false;
  if (areSidebarMenuOrdersEqual(currentOrderIds, remoteOrderIds)) return false;

  if (!remoteUpdatedAt) return true;
  if (!lastAppliedUpdatedAt) return true;

  return remoteUpdatedAt >= lastAppliedUpdatedAt;
}

export function broadcastSidebarMenuOrderChange(orderIds: string[] | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SIDEBAR_MENU_ORDER_SYNC_EVENT, {
      detail: { orderIds },
    }),
  );
}
