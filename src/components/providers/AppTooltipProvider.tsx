'use client';

import { TooltipProvider } from '@/components/ui/tooltip';

export function AppTooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      {children}
    </TooltipProvider>
  );
}
