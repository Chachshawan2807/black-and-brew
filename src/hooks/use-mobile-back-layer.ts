'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import {
  createMobileBackHistoryState,
  type MobileBackLayerId,
  shouldSyncHistoryOnLayerClose,
} from '@/lib/mobile-back-layer';

export type UseMobileBackLayerOptions = {
  /** Set true before deactivating the layer to navigate away avoids history.back() from the new route. */
  closingForNavigationRef?: MutableRefObject<boolean>;
};

/**
 * Maps Android/iOS edge-back and browser back to closing an overlay instead of exiting the PWA.
 * Push a history entry while `active`; popstate dismisses; UI close removes the entry.
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

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    dismissedByGestureRef.current = false;
    window.history.pushState(createMobileBackHistoryState(layerId), '');

    const handlePopState = () => {
      dismissedByGestureRef.current = true;
      onDismissRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      const closingForNavigation = closingForNavigationRef?.current === true;
      if (closingForNavigationRef) {
        closingForNavigationRef.current = false;
      }
      if (
        shouldSyncHistoryOnLayerClose(
          dismissedByGestureRef.current,
          window.history.state,
          layerId,
          closingForNavigation,
        )
      ) {
        window.history.back();
      }
    };
  }, [active, layerId, closingForNavigationRef]);
}
