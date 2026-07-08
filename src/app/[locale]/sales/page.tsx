import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { getAllProductCategories, getSalesMetrics } from '@/app/actions/sales-actions';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const SalesClient = createLazyFeatureClient(
  () => import('./SalesClient'),
  'กำลังโหลดข้อมูลยอดขาย...',
);

export default async function SalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    redirect(`/${locale}`);
  }

  const [initialMetrics, categoriesResult] = await Promise.all([
    getSalesMetrics(undefined, undefined, { includeAllProducts: false }),
    getAllProductCategories(),
  ]);

  return (
    <SalesClient
      initialMetrics={initialMetrics}
      initialCategories={categoriesResult.success ? categoriesResult.categories : []}
      locale={locale}
    />
  );
}
