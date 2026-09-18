import { Suspense } from 'react';
import { checkAuth } from '@/app/actions/auth';
import { loadHomeMemberPanel, loadSecretaryBoard } from '@/app/actions/home-actions';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import { HomeClientEntry } from './_components/HomeClientEntry';
import { HomePageLoadingSkeleton } from './_components/HomePageLoadingSkeleton';
import HomeClient from './HomeClient';

function isHomeAuthPending(error?: string): boolean {
  if (!error) return true;
  return error.toLowerCase().includes('unauthorized');
}

async function HomeBoard({ locale }: { locale: string }) {
  const boardPromise = loadSecretaryBoard({ locale });
  const authed = await checkAuth();
  if (!authed) {
    return <HomeClientEntry locale={locale} />;
  }

  const workDateIso = todayIsoBkk();
  const [boardResult, memberPanelResult] = await Promise.all([
    boardPromise,
    loadHomeMemberPanel({ dateIso: workDateIso }),
  ]);

  let initialMemberPanel = memberPanelResult.success ? memberPanelResult.panel : undefined;

  if (!boardResult.success || !boardResult.board) {
    if (isHomeAuthPending(boardResult.error)) {
      return <HomeClientEntry locale={locale} />;
    }
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-[14px] text-muted-foreground">
        ไม่สามารถโหลดงานได้{boardResult.error ? `: ${boardResult.error}` : ''}
      </div>
    );
  }

  const boardDateIso = boardResult.board.snapshot.dateIso;
  if (
    initialMemberPanel &&
    boardDateIso &&
    initialMemberPanel.dateIso !== boardDateIso
  ) {
    const aligned = await loadHomeMemberPanel({ dateIso: boardDateIso });
    if (aligned.success && aligned.panel) {
      initialMemberPanel = aligned.panel;
    } else {
      initialMemberPanel = undefined;
    }
  }

  return (
    <HomeClient
      initialBoard={boardResult.board}
      initialMemberPanel={initialMemberPanel}
      locale={locale}
      boardLoadSource="ssr"
    />
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
