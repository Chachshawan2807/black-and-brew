export function getBeanOrderCustomerDisplayName(order: {
  customerName?: string | null;
  recipientName: string;
}): string {
  return order.customerName?.trim() || order.recipientName.trim() || '—';
}
