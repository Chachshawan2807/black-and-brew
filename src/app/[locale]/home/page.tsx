import { checkAuth } from '@/app/actions/auth';
import { loadSecretaryBoard } from '@/app/actions/home-actions';
import { HomeAuthRefresh } from './_components/HomeAuthRefresh';
import HomeClient from './HomeClient';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    return (
      <>
        <HomeAuthRefresh />
        <div className="mx-auto w-full max-w-3xl px-4 py-8 text-[14px] text-muted-foreground">
          กำลังตรวจสอบสิทธิ์...
        </div>
      </>
    );
  }

  const boardResult = await loadSecretaryBoard({ locale });
  if (!boardResult.success || !boardResult.board) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-[14px] text-muted-foreground">
        ไม่สามารถโหลดงานได้{boardResult.error ? `: ${boardResult.error}` : ''}
      </div>
    );
  }

  return <HomeClient initialBoard={boardResult.board} locale={locale} />;
}
