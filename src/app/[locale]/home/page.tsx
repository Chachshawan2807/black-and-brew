import { Suspense } from 'react';
import { checkAuth } from '@/app/actions/auth';
import { loadSecretaryBoard } from '@/app/actions/home-actions';
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

  const boardResult = await boardPromise;
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

  return (
    <HomeClient initialBoard={boardResult.board} locale={locale} boardLoadSource="ssr" />
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
