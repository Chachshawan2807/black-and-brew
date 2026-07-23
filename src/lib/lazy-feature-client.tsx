import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';

export function createLazyFeatureClient<P>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  _label?: string,
): ComponentType<P> {
  return dynamic(importFn, {
    // Route-level loading.tsx already covers RSC fetch; avoid a second full-screen skeleton.
    loading: () => null,
  }) as ComponentType<P>;
}
