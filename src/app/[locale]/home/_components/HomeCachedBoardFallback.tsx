'use client';

import { useSyncExternalStore } from 'react';
import { HomeTaskBoard } from '../HomeClient';
import {
  getCachedSecretaryBoardSnapshot,
  readCachedHomeMemberPanel,
  subscribeSecretaryBoardCache,
} from '@/lib/secretary/home-board-cache';
import { HomeDashboardFrame, HomeShiftPane } from './HomeDashboardFrame';
import { HomePageLoadingSkeleton, HomeTaskCardsSkeleton } from './HomePageLoadingSkeleton';

function useCachedSecretaryBoard(locale: string) {
  return useSyncExternalStore(
    subscribeSecretaryBoardCache,
    () => getCachedSecretaryBoardSnapshot(locale),
    () => null,
  );
}

export function HomeCachedTaskFallback({ locale }: { locale: string }) {
  const board = useCachedSecretaryBoard(locale);
  if (!board) return <HomeTaskCardsSkeleton />;

  return (
    <HomeTaskBoard
      initialBoard={board}
      locale={locale}
      preview
      boardLoadSource="session-cache"
    />
  );
}

export function HomeCachedPageFallback({ locale }: { locale: string }) {
  const board = useCachedSecretaryBoard(locale);
  if (!board) return <HomePageLoadingSkeleton />;

  const panel = readCachedHomeMemberPanel(board.snapshot.dateIso) ?? undefined;

  return (
    <HomeDashboardFrame workDateIso={board.snapshot.dateIso}>
      <HomeTaskBoard
        initialBoard={board}
        locale={locale}
        preview
        boardLoadSource="session-cache"
      />
      <HomeShiftPane dateIso={board.snapshot.dateIso} initialPanel={panel} />
    </HomeDashboardFrame>
  );
}
