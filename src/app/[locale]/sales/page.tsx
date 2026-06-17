import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { getAllProductCategories, getSalesMetrics } from '@/app/actions/sales-actions';
import SalesClient from './SalesClient';

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
    getSalesMetrics(),
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
