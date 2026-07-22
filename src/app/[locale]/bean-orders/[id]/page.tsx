import { notFound, redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { fetchBeanOrderDetail } from '@/app/actions/bean-order-actions';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const BeanOrderDetailClient = createLazyFeatureClient(
  () => import('../BeanOrderDetailClient'),
  'กำลังโหลดรายละเอียดออเดอร์...',
);

export default async function BeanOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const [{ locale, id }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) redirect(`/${locale}`);

  const result = await fetchBeanOrderDetail(id);
  if (!result.success || !result.data) notFound();

  return <BeanOrderDetailClient order={result.data} locale={locale} />;
}
