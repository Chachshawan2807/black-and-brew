'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import {
  beginMobileBackLayerMount,
  claimMobileBackHistoryEntry,
  createMobileBackHistoryState,
  isCurrentMobileBackLayerMount,
  type MobileBackLayerId,
  releaseMobileBackHistoryEntry,
  shouldDismissMobileBackLayerOnPopState,
  shouldInterceptMobileBackHistory,
  shouldSyncHistoryOnLayerClose,
} from '@/lib/mobile-back-layer';

export type UseMobileBackLayerOptions = {
  /** Set true before deactivating the layer to navigate away avoids history.back() from the new route. */
  closingForNavigationRef?: MutableRefObject<boolean>;
};

/**
 * Maps Android/iOS edge-back and browser back to closing an overlay instead of exiting the PWA.
 * Touch devices only: desktop must not push/pop history or overlays bounce to the previous window.
 * Push a history entry while `active`; popstate dismisses; UI close removes the entry.
 * Remount while still open must not call history.back() or the overlay bounces shut later.
 */
export function useMobileBackLayer(
  layerId: MobileBackLayerId,
  active: boolean,
  onDismiss: () => void,
  options?: UseMobileBackLayerOptions,
): void {
  const dismissedByGestureRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  const closingForNavigationRef = options?.closingForNavigationRef;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    if (!shouldInterceptMobileBackHistory()) return;

    const generation = beginMobileBackLayerMount(layerId);
    dismissedByGestureRef.current = false;
    if (claimMobileBackHistoryEntry(layerId)) {
      window.history.pushState(createMobileBackHistoryState(layerId), '');
    }

    const releaseHistory = () => {
      releaseMobileBackHistoryEntry(layerId);
    };

    const popOwnedHistory = () => {
      if (
        shouldSyncHistoryOnLayerClose(
          false,
          window.history.state,
          layerId,
          false,
          false,
        )
      ) {
        releaseHistory();
        window.history.back();
        return;
      }
      releaseHistory();
    };

    const handlePopState = (event: PopStateEvent) => {
      if (!shouldDismissMobileBackLayerOnPopState(layerId, event.state)) {
        return;
      }
      dismissedByGestureRef.current = true;
      releaseHistory();
      onDismissRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      const closingForNavigation = closingForNavigationRef?.current === true;
      if (closingForNavigationRef) {
        closingForNavigationRef.current = false;
      }
      if (dismissedByGestureRef.current) {
        return;
      }
      if (closingForNavigation) {
        releaseHistory();
        return;
      }

      const layerStillActive = activeRef.current === true;
      if (!layerStillActive) {
        popOwnedHistory();
        return;
      }

      queueMicrotask(() => {
        if (!isCurrentMobileBackLayerMount(layerId, generation)) return;
        popOwnedHistory();
      });
    };
  }, [active, layerId, closingForNavigationRef]);
}
