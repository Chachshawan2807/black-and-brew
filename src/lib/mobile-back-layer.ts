export const MOBILE_BACK_STATE_KEY = 'bbMobileBack';

export const MOBILE_BACK_LAYER_IDS = [
  'mobile-nav-drawer',
  'notification-panel',
  'quick-action-overlay',
  'schedule-overlay',
  'inventory-overlay',
  'home-overlay',
  'dashboard-roster-overlay',
  'dashboard-weekly-overlay',
  'maintenance-overlay',
  'branch-withdraw-overlay',
  'inventory-count-overlay',
  'bean-orders-overlay',
] as const;

export type MobileBackLayerId = (typeof MOBILE_BACK_LAYER_IDS)[number];

export type MobileBackHistoryState = {
  [MOBILE_BACK_STATE_KEY]: MobileBackLayerId;
};

export function isMobileBackLayerId(value: unknown): value is MobileBackLayerId {
  return (
    typeof value === 'string' &&
    (MOBILE_BACK_LAYER_IDS as readonly string[]).includes(value)
  );
}

export function createMobileBackHistoryState(layerId: MobileBackLayerId): MobileBackHistoryState {
  return { [MOBILE_BACK_STATE_KEY]: layerId };
}

export function readMobileBackLayerId(state: unknown): MobileBackLayerId | null {
  if (!state || typeof state !== 'object') return null;
  const layerId = (state as MobileBackHistoryState)[MOBILE_BACK_STATE_KEY];
  return isMobileBackLayerId(layerId) ? layerId : null;
}

export function shouldSyncHistoryOnLayerClose(
  dismissedByGesture: boolean,
  historyState: unknown,
  layerId: MobileBackLayerId,
  closingForNavigation = false,
): boolean {
  if (dismissedByGesture || closingForNavigation) return false;
  return readMobileBackLayerId(historyState) === layerId;
}

/** After popstate, only dismiss when navigation left this layer (not when a child overlay closed above). */
export function shouldDismissMobileBackLayerOnPopState(
  layerId: MobileBackLayerId,
  newHistoryState: unknown,
): boolean {
  return readMobileBackLayerId(newHistoryState) !== layerId;
}
