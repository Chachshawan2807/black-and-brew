'use client';

import { useEffect } from 'react';
import { installPointerClickThroughGuardCapture } from '@/lib/pointer-overlay-selection';

/** Swallows ghost clicks after portaled overlay option selection (iOS touch). */
export function PointerClickThroughGuard() {
  useEffect(() => installPointerClickThroughGuardCapture(), []);
  return null;
}
