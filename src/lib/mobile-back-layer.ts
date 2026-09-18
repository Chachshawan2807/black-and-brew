export const MOBILE_BACK_STATE_KEY = 'bbMobileBack';

export type MobileBackLayerId =
  | 'mobile-nav-drawer'
  | 'notification-panel'
  | 'quick-action-overlay'
  | 'schedule-overlay';

export type MobileBackHistoryState = {
  [MOBILE_BACK_STATE_KEY]: MobileBackLayerId;
};

export function createMobileBackHistoryState(layerId: MobileBackLayerId): MobileBackHistoryState {
  return { [MOBILE_BACK_STATE_KEY]: layerId };
}

export function readMobileBackLayerId(state: unknown): MobileBackLayerId | null {
  if (!state || typeof state !== 'object') return null;
  const layerId = (state as MobileBackHistoryState)[MOBILE_BACK_STATE_KEY];
  if (
    layerId === 'mobile-nav-drawer' ||
    layerId === 'notification-panel' ||
    layerId === 'quick-action-overlay' ||
    layerId === 'schedule-overlay'
  ) {
    return layerId;
  }
  return null;
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
