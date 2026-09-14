import dynamic from 'next/dynamic';
import { connection } from 'next/server';
import { RouteLoadingSkeleton } from '@/components/ui/route-loading-skeleton';

const HomePageClient = dynamic(() => import('./_components/HomePageClient'), {
  loading: () => <RouteLoadingSkeleton label="กำลังโหลดหน้าแรก..." />,
});

export default async function IndexPage() {
  await connection();
  return <HomePageClient />;
}
