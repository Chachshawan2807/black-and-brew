import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { checkAuth } from '@/app/actions/auth';
import {
  fetchBeanOrderDetail,
  fetchBeanOrderFormSuggestions,
  fetchInventoryItemsForBeanOrders,
} from '@/app/actions/bean-order-actions';
import { canEditOrderLines } from '@/lib/bean-orders/order-status';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const BeanOrderFormClient = createLazyFeatureClient(
  () => import('../../BeanOrderFormClient'),
  'กำลังโหลดฟอร์มออเดอร์...',
);

/** Build-time validation path for Cache Components (requires ≥1 static param). */
export async function generateStaticParams() {
  return [{ id: 'build-placeholder' }];
}

export default async function EditBeanOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await connection();
  const { locale, id } = await params;
  const authed = await checkAuth();
  if (!authed) redirect(`/${locale}`);

  const orderResult = await fetchBeanOrderDetail(id);
  if (!orderResult.success || !orderResult.data) notFound();
  if (!canEditOrderLines(orderResult.data.cancelledAt)) notFound();

  const [itemsResult, suggestionsResult] = await Promise.all([
    fetchInventoryItemsForBeanOrders(),
    fetchBeanOrderFormSuggestions(),
  ]);

  return (
    <BeanOrderFormClient
      mode="edit"
      orderId={id}
      initialOrder={orderResult.data}
      inventoryItems={itemsResult.success ? itemsResult.data ?? [] : []}
      formSuggestions={suggestionsResult.success ? suggestionsResult.data : undefined}
      locale={locale}
    />
  );
}
