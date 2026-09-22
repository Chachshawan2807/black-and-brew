import { Suspense } from 'react';
import { connection } from 'next/server';
import { checkAuth } from '@/app/actions/auth';
import {
  hydrateSecretaryBoardSnapshot,
  loadHomeMemberPanel,
  loadSecretaryBoard,
} from '@/app/actions/home-actions';
import { resolveSnapshotScopesForBoardTasks } from '@/lib/secretary/resolve-board-hydration-scopes';
import type { HomeBoardDetailUpdate } from '@/lib/secretary/snapshot-patch';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import {
  HomeCachedPageFallback,
  HomeCachedTaskFallback,
} from './_components/HomeCachedBoardFallback';
import { HomeClientEntry } from './_components/HomeClientEntry';
import {
  HomeDashboardFrame,
  HomeShiftPane,
} from './_components/HomeDashboardFrame';
import { HomeShiftPanelSkeleton } from './_components/HomePageLoadingSkeleton';
import { HomeTaskBoard } from './HomeClient';

function scheduleHomeBoardDetail(
  boardPromise: ReturnType<typeof loadSecretaryBoard>,
  locale: string,
): Promise<HomeBoardDetailUpdate | null> {
  return boardPromise.then(async (result) => {
    if (!result.success || !result.board) return null;
    const scopes = resolveSnapshotScopesForBoardTasks(result.board.tasks);
    if (scopes.length === 0) return null;

    try {
      const hydrated = await hydrateSecretaryBoardSnapshot({
        dateIso: result.board.snapshot.dateIso,
        locale,
        scopes,
        baseSnapshot: result.board.snapshot,
      });
      if (!hydrated.success || !hydrated.snapshot) return null;
      return {
        snapshot:
          hydrated.snapshot.detailStatus === 'ready'
            ? hydrated.snapshot
            : { ...hydrated.snapshot, detailStatus: 'ready' },
        snapshotPatch: hydrated.snapshotPatch,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[scheduleHomeBoardDetail]', message);
      return null;
    }
  });
}

async function HomeTasksSlot({
  locale,
  boardPromise,
  detailPromise,
}: {
  locale: string;
  boardPromise: ReturnType<typeof loadSecretaryBoard>;
  detailPromise: Promise<HomeBoardDetailUpdate | null>;
}) {
  const boardResult = await boardPromise;
  if (!boardResult.success || !boardResult.board) {
    return (
      <div className="px-1 py-4 text-[14px] text-muted-foreground">
        ไม่สามารถโหลดงานได้{boardResult.error ? `: ${boardResult.error}` : ''}
      </div>
    );
  }

  return (
    <HomeTaskBoard
      initialBoard={boardResult.board}
      locale={locale}
      boardLoadSource="ssr"
      detailPromise={detailPromise}
    />
  );
}

async function HomeShiftsSlot({
  dateIso,
  panelPromise,
}: {
  dateIso: string;
  panelPromise: ReturnType<typeof loadHomeMemberPanel>;
}) {
  const memberPanelResult = await panelPromise;
  return (
    <HomeShiftPane
      key={dateIso}
      dateIso={dateIso}
      initialPanel={memberPanelResult.success ? memberPanelResult.panel : undefined}
      clockEpochMs={Date.now()}
    />
  );
}

async function HomeBoard({ locale }: { locale: string }) {
  await connection();
  const workDateIso = todayIsoBkk();
  const authedPromise = checkAuth();
  const boardPromise = loadSecretaryBoard({ locale, dateIso: workDateIso });
  const detailPromise = scheduleHomeBoardDetail(boardPromise, locale);
  const memberPanelPromise = loadHomeMemberPanel({ dateIso: workDateIso });
  const authed = await authedPromise;
  if (!authed) {
    return <HomeClientEntry locale={locale} />;
  }

  return (
    <HomeDashboardFrame workDateIso={workDateIso}>
      <Suspense fallback={<HomeCachedTaskFallback locale={locale} />}>
        <HomeTasksSlot
          locale={locale}
          boardPromise={boardPromise}
          detailPromise={detailPromise}
        />
      </Suspense>
      <Suspense fallback={<HomeShiftPanelSkeleton />}>
        <HomeShiftsSlot dateIso={workDateIso} panelPromise={memberPanelPromise} />
      </Suspense>
    </HomeDashboardFrame>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <Suspense fallback={<HomeCachedPageFallback locale={locale} />}>
      <HomeBoard locale={locale} />
    </Suspense>
  );
}
