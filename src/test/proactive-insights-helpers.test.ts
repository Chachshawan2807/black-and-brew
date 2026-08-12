import { describe, expect, test } from 'vitest';
import { resolvePendingBeanOrderStatusLabel } from '@/lib/proactive-insights/pending-bean-order-status';
import { formatShortDayDate } from '@/lib/proactive-insights/format-short-day';

describe('proactive insight helpers', () => {
  test('formatShortDayDate uses abbreviated weekday and day number only', () => {
    expect(formatShortDayDate('2026-07-21', 1)).toBe('อ. 21');
    expect(formatShortDayDate('2026-07-24', 4)).toBe('ศ. 24');
  });

  test('resolvePendingBeanOrderStatusLabel prefers payment over fulfillment', () => {
    expect(resolvePendingBeanOrderStatusLabel('unpaid', 'pending')).toBe('ค้างชำระเงิน');
    expect(resolvePendingBeanOrderStatusLabel('paid', 'pending')).toBe('ค้างจัดส่ง');
    expect(resolvePendingBeanOrderStatusLabel('paid', 'shipped', null)).toBe('รอส่งมอบ');
    expect(resolvePendingBeanOrderStatusLabel('paid', 'shipped', 'delivered')).toBeNull();
  });
});
