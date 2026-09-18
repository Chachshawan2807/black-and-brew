'use client';

import { useCallback, useMemo } from 'react';
import { useMobileBackLayer } from '@/hooks/use-mobile-back-layer';
import type { MobileBackLayerId } from '@/lib/mobile-back-layer';

export type MobileBackOverlayLayer = {
  active: boolean;
  dismiss: () => void;
};

/**
 * One history entry per route overlay stack while any layer is active.
 * System back dismisses the first active layer (list top / highest priority first).
 */
export function useMobileBackOverlayStack(
  layerId: MobileBackLayerId,
  layers: readonly MobileBackOverlayLayer[],
): void {
  const active = useMemo(() => layers.some((layer) => layer.active), [layers]);
  const dismiss = useCallback(() => {
    for (const layer of layers) {
      if (layer.active) {
        layer.dismiss();
        return;
      }
    }
  }, [layers]);

  useMobileBackLayer(layerId, active, dismiss);
}
