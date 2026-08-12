'use client';

import { useEffect, useRef } from 'react';
import {
  createMobileBackHistoryState,
  type MobileBackLayerId,
  shouldSyncHistoryOnLayerClose,
} from '@/lib/mobile-back-layer';

/**
 * Maps Android/iOS edge-back and browser back to closing an overlay instead of exiting the PWA.
 * Push a history entry while `active`; popstate dismisses; UI close removes the entry.
 */
export function useMobileBackLayer(
  layerId: MobileBackLayerId,
  active: boolean,
  onDismiss: () => void,
): void {
  const dismissedByGestureRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

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
      if (
        shouldSyncHistoryOnLayerClose(
          dismissedByGestureRef.current,
          window.history.state,
          layerId,
        )
      ) {
        window.history.back();
      }
    };
  }, [active, layerId]);
}
