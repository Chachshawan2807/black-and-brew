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
  const [authed, orderResult, itemsResult, suggestionsResult] = await Promise.all([
    checkAuth(),
    fetchBeanOrderDetail(id),
    fetchInventoryItemsForBeanOrders(),
    fetchBeanOrderFormSuggestions(),
  ]);
  if (!authed) redirect(`/${locale}`);

  // Genuine miss -> 404; transient failure -> retryable error boundary (not blank).
  if (orderResult.notFound) notFound();
  if (!orderResult.success || !orderResult.data) {
    throw new Error(orderResult.error ?? 'โหลดรายละเอียดออเดอร์ไม่สำเร็จ');
  }
  if (!canEditOrderLines(orderResult.data.cancelledAt)) notFound();

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
