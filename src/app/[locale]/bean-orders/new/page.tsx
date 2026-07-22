import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { checkAuth } from '@/app/actions/auth';
import { fetchInventoryItemsForBeanOrders } from '@/app/actions/bean-order-actions';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const BeanOrderFormClient = createLazyFeatureClient(
  () => import('../BeanOrderFormClient'),
  'กำลังโหลดฟอร์มออเดอร์...',
);

export default async function NewBeanOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await connection();
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) redirect(`/${locale}`);

  const itemsResult = await fetchInventoryItemsForBeanOrders();

  return (
    <BeanOrderFormClient
      inventoryItems={itemsResult.success ? itemsResult.data ?? [] : []}
      locale={locale}
    />
  );
}
