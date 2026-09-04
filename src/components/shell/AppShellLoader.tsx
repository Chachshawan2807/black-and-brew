'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { RouteLoadingSkeleton } from '@/components/ui/route-loading-skeleton';

const AppShell = dynamic(
  () => import('@/components/shell/AppShell').then((m) => ({ default: m.AppShell })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-full flex flex-col">
        <RouteLoadingSkeleton label="กำลังเตรียมระบบ..." />
      </div>
    ),
  },
);

/** Client entry that defers the heavy AppShell graph to a separate dev/prod chunk. */
export function AppShellLoader({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
