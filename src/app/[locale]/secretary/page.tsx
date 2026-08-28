import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { loadSecretaryBoard } from '@/app/actions/secretary-actions';
import SecretaryClient from './SecretaryClient';

export default async function SecretaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    redirect(`/${locale}`);
  }

  const boardResult = await loadSecretaryBoard({ locale });
  if (!boardResult.success || !boardResult.board) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-[14px] text-muted-foreground">
        ไม่สามารถโหลดเลขาส่วนตัวได้{boardResult.error ? `: ${boardResult.error}` : ''}
      </div>
    );
  }

  return <SecretaryClient initialBoard={boardResult.board} locale={locale} />;
}
