import { Suspense } from 'react';
import { connection } from 'next/server';
import { checkAuth } from '@/app/actions/auth';
import { loadHomeMemberPanel, loadSecretaryBoard } from '@/app/actions/home-actions';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import { HomeClientEntry } from './_components/HomeClientEntry';
import {
  HomeDashboardFrame,
  HomeShiftPane,
} from './_components/HomeDashboardFrame';
import {
  HomePageLoadingSkeleton,
  HomeShiftPanelSkeleton,
  HomeTaskCardsSkeleton,
} from './_components/HomePageLoadingSkeleton';
import { HomeTaskBoard } from './HomeClient';

async function HomeTasksSlot({
  locale,
  boardPromise,
}: {
  locale: string;
  boardPromise: ReturnType<typeof loadSecretaryBoard>;
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
      dateIso={dateIso}
      initialPanel={memberPanelResult.success ? memberPanelResult.panel : undefined}
    />
  );
}

async function HomeBoard({ locale }: { locale: string }) {
  await connection();
  const workDateIso = todayIsoBkk();
  const authedPromise = checkAuth();
  const boardPromise = loadSecretaryBoard({ locale, dateIso: workDateIso });
  const memberPanelPromise = loadHomeMemberPanel({ dateIso: workDateIso });
  const authed = await authedPromise;
  if (!authed) {
    return <HomeClientEntry locale={locale} />;
  }

  return (
    <HomeDashboardFrame workDateIso={workDateIso}>
      <Suspense fallback={<HomeTaskCardsSkeleton />}>
        <HomeTasksSlot locale={locale} boardPromise={boardPromise} />
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
    <Suspense fallback={<HomePageLoadingSkeleton />}>
      <HomeBoard locale={locale} />
    </Suspense>
  );
}
