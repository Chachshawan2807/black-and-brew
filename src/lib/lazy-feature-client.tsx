import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { RouteLoadingSkeleton } from '@/components/ui/route-loading-skeleton';

export function createLazyFeatureClient<P>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  label: string,
): ComponentType<P> {
  return dynamic(importFn, {
    loading: () => <RouteLoadingSkeleton label={label} />,
  }) as ComponentType<P>;
}
