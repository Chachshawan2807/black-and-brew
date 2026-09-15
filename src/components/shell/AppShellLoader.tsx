'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';

/** Client shell entry. Route RSC children render immediately without a second dynamic shell chunk. */
export function AppShellLoader({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
