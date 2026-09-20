'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatSecretaryWorkDateLabel } from '@/lib/secretary/board-card-surface';
import { writeCachedHomeMemberPanel } from '@/lib/secretary/home-board-cache';
import { watchBangkokWorkDate } from '@/lib/secretary/watch-bangkok-work-date';
import { useSidebarHydrated, useSidebarToggle } from '@/hooks/use-sidebar-toggle';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import HomeShiftStatusSection from './HomeShiftStatusSection';

export function HomeDashboardFrame({
  workDateIso: initialWorkDateIso,
  children,
}: {
  workDateIso: string;
  children: ReactNode;
}) {
  const [workDateIso, setWorkDateIso] = useState(initialWorkDateIso);
  const sidebarHydrated = useSidebarHydrated();
  const sidebarIsOpen = useSidebarToggle((state) => state.isOpen);
  const desktopSplit = sidebarHydrated && !sidebarIsOpen;
  const workDateLabel = useMemo(
    () => formatSecretaryWorkDateLabel(workDateIso),
    [workDateIso],
  );

  useEffect(() => watchBangkokWorkDate(setWorkDateIso), []);

  return (
    <div
      className={cn(
        'mx-auto w-full px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)] space-y-4',
        desktopSplit ? 'max-w-6xl' : 'max-w-3xl',
      )}
    >
      <header>
        <h1 className="bb-page-title-compact text-balance">{workDateLabel}</h1>
      </header>
      <div
        className={cn(
          'space-y-4',
          desktopSplit && 'md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function HomeShiftPane({
  dateIso,
  initialPanel,
}: {
  dateIso: string;
  initialPanel?: HomeMemberPanelSnapshot;
}) {
  const [activeDateIso, setActiveDateIso] = useState(dateIso);
  const sidebarHydrated = useSidebarHydrated();
  const sidebarIsOpen = useSidebarToggle((state) => state.isOpen);
  const desktopSplit = sidebarHydrated && !sidebarIsOpen;

  useEffect(() => watchBangkokWorkDate(setActiveDateIso), []);

  useEffect(() => {
    if (initialPanel?.dateIso === activeDateIso) {
      writeCachedHomeMemberPanel(initialPanel);
    }
  }, [activeDateIso, initialPanel]);

  const panelSeedKey =
    initialPanel?.dateIso === activeDateIso ? 'seeded' : 'pending';

  return (
    <HomeShiftStatusSection
      key={`${activeDateIso}-${panelSeedKey}`}
      dateIso={activeDateIso}
      initialPanel={initialPanel?.dateIso === activeDateIso ? initialPanel : undefined}
      showWhenEmpty={desktopSplit}
    />
  );
}
