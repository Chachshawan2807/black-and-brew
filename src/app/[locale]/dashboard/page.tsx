import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import {
  DashboardMonthlyStream,
  DashboardWeeklyStream,
} from './_components/DashboardStreams';

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    redirect(`/${locale}`);
  }

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-12 text-foreground relative font-normal">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
          <div className="h-4" />
        </header>

        <main className="space-y-12">
          <DashboardWeeklyStream searchParams={searchParams} />
          <div className="pt-8 border-t border-[#000000]/5">
            <DashboardMonthlyStream searchParams={searchParams} />
          </div>
        </main>
      </div>
    </div>
  );
}
