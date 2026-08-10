import type { PendingBeanOrderInsight } from '@/lib/proactive-insights/types';

/** Aggregate pending bean orders by status label — one compact line. */
export function formatPendingBeanOrdersSummary(orders: PendingBeanOrderInsight[]): string {
  if (orders.length === 0) return '';

  const counts = new Map<string, number>();
  for (const order of orders) {
    counts.set(order.statusLabel, (counts.get(order.statusLabel) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([statusLabel, count]) => `${statusLabel} ${count} รายการ`)
    .join(' · ');
}
