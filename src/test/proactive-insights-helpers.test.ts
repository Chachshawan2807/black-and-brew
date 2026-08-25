import { describe, expect, test } from 'vitest';
import { resolvePendingBeanOrderStatusLabel } from '@/lib/proactive-insights/pending-bean-order-status';

describe('resolvePendingBeanOrderStatusLabel', () => {
  test('resolvePendingBeanOrderStatusLabel prefers payment over fulfillment', () => {
    expect(resolvePendingBeanOrderStatusLabel('unpaid', 'pending')).toBe('ค้างชำระเงิน');
    expect(resolvePendingBeanOrderStatusLabel('paid', 'pending')).toBe('ค้างจัดส่ง');
    expect(resolvePendingBeanOrderStatusLabel('paid', 'shipped')).toBeNull();
    expect(resolvePendingBeanOrderStatusLabel('paid', 'shipped')).toBeNull();
  });
});
