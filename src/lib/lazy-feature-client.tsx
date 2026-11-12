import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { RouteLoadingSkeleton } from '@/components/ui/route-loading-skeleton';

export function createLazyFeatureClient<P>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  return dynamic(importFn, {
    // Route loading.tsx covers RSC; this covers client chunk load (iOS shortcut must not flash blank).
    loading: () => <RouteLoadingSkeleton label="กำลังโหลด..." />,
  }) as ComponentType<P>;
}
