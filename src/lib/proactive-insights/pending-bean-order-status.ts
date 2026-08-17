/** Thai label for a bean order that still needs staff action. */
export function resolvePendingBeanOrderStatusLabel(
  paymentStatus: string,
  fulfillmentStatus: string,
  _trackingStatus?: string | null,
): string | null {
  if (paymentStatus === 'unpaid') return 'ค้างชำระเงิน';
  if (fulfillmentStatus === 'pending') return 'ค้างจัดส่ง';
  return null;
}
