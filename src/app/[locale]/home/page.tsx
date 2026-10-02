import { Suspense } from 'react';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { checkAuth } from '@/app/actions/auth';
import {
  hydrateSecretaryBoardSnapshot,
  loadHomeMemberPanel,
  loadSecretaryBoard,
} from '@/app/actions/home-actions';
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
  dateIso: string,
  locale: string,
): Promise<HomeBoardDetailUpdate | null> {
  return hydrateSecretaryBoardSnapshot({ dateIso, locale })
    .then((hydrated) => {
      if (!hydrated.success || !hydrated.snapshot) return null;
      return {
        snapshot: { ...hydrated.snapshot, detailStatus: 'ready' as const },
      };
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[scheduleHomeBoardDetail]', message);
      return null;
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
  const duringServerAction = (await headers()).has('next-action');
  const detailPromise = duringServerAction
    ? Promise.resolve(null)
    : scheduleHomeBoardDetail(workDateIso, locale);
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
