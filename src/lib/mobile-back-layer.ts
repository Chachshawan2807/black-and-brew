import { isCoarsePointer } from '@/hooks/use-coarse-pointer';

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
  'bean-orders-slip-overlay',
  'pwa-install-overlay',
] as const;

export type MobileBackLayerId = (typeof MOBILE_BACK_LAYER_IDS)[number];

export type MobileBackHistoryState = Record<string, unknown> & {
  [MOBILE_BACK_STATE_KEY]: MobileBackLayerId;
};

export function isMobileBackLayerId(value: unknown): value is MobileBackLayerId {
  return (
    typeof value === 'string' &&
    (MOBILE_BACK_LAYER_IDS as readonly string[]).includes(value)
  );
}

function cloneHistoryState(state: unknown): Record<string, unknown> {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return {};
  return { ...(state as Record<string, unknown>) };
}

export function createMobileBackHistoryState(
  layerId: MobileBackLayerId,
  currentState: unknown = null,
): MobileBackHistoryState {
  return {
    ...cloneHistoryState(currentState),
    [MOBILE_BACK_STATE_KEY]: layerId,
  };
}

export function readMobileBackLayerId(state: unknown): MobileBackLayerId | null {
  if (!state || typeof state !== 'object') return null;
  const layerId = (state as MobileBackHistoryState)[MOBILE_BACK_STATE_KEY];
  return isMobileBackLayerId(layerId) ? layerId : null;
}

const mountGenerations = new Map<MobileBackLayerId, number>();
const claimedHistoryLayers = new Set<MobileBackLayerId>();

export function beginMobileBackLayerMount(layerId: MobileBackLayerId): number {
  const next = (mountGenerations.get(layerId) ?? 0) + 1;
  mountGenerations.set(layerId, next);
  return next;
}

export function isCurrentMobileBackLayerMount(
  layerId: MobileBackLayerId,
  generation: number,
): boolean {
  return mountGenerations.get(layerId) === generation;
}

/** First caller for this overlay owns the history entry; remounts reuse it. */
export function claimMobileBackHistoryEntry(layerId: MobileBackLayerId): boolean {
  if (claimedHistoryLayers.has(layerId)) return false;
  claimedHistoryLayers.add(layerId);
  return true;
}

export function releaseMobileBackHistoryEntry(layerId: MobileBackLayerId): void {
  claimedHistoryLayers.delete(layerId);
}

export function resetMobileBackLayerRuntimeForTests(): void {
  mountGenerations.clear();
  claimedHistoryLayers.clear();
}

export function shouldInterceptMobileBackHistory(
  media?: Parameters<typeof isCoarsePointer>[0],
): boolean {
  return isCoarsePointer(media);
}

/** Overlay remount or orphan unmount must never auto history.back(). */
export function shouldPopHistoryOnOrphanUnmount(_layerStillActive: boolean): boolean {
  return false;
}

export function preserveClaimedMobileBackOnReplace(
  incomingState: unknown,
  currentState: unknown,
): unknown {
  const currentLayer = readMobileBackLayerId(currentState);
  if (!currentLayer || !claimedHistoryLayers.has(currentLayer)) {
    return incomingState;
  }
  return createMobileBackHistoryState(currentLayer, incomingState);
}

let nativeReplaceState: History['replaceState'] | null = null;

export function ensureMobileBackHistoryGuard(): void {
  if (typeof window === 'undefined' || nativeReplaceState) return;
  nativeReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (data, unused, url) => {
    return nativeReplaceState!(
      preserveClaimedMobileBackOnReplace(data, window.history.state),
      unused,
      url,
    );
  };
}

export function shouldSyncHistoryOnLayerClose(
  dismissedByGesture: boolean,
  historyState: unknown,
  layerId: MobileBackLayerId,
  closingForNavigation = false,
  layerStillActive = false,
): boolean {
  if (dismissedByGesture || closingForNavigation || layerStillActive) return false;
  return readMobileBackLayerId(historyState) === layerId;
}

/** After popstate, only dismiss when navigation left this layer (not when a child overlay closed above). */
export function shouldDismissMobileBackLayerOnPopState(
  layerId: MobileBackLayerId,
  newHistoryState: unknown,
): boolean {
  return readMobileBackLayerId(newHistoryState) !== layerId;
}
