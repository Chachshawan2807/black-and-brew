import { describe, expect, test } from 'vitest';
import { formatPendingBeanOrdersSummary } from '@/lib/proactive-insights/format-pending-bean-orders';
import { resolveInsightCronOccurredAt } from '@/lib/proactive-insights/insight-schedule';

describe('formatPendingBeanOrdersSummary', () => {
  test('aggregates duplicate statuses into one line', () => {
    expect(
      formatPendingBeanOrdersSummary([
        { customerName: 'ทศกัณฐ์', statusLabel: 'ค้างชำระเงิน' },
        { customerName: 'ทศกัณฐ์', statusLabel: 'ค้างชำระเงิน' },
        { customerName: 'ทศกัณฐ์', statusLabel: 'ค้างชำระเงิน' },
        { customerName: 'ทศกัณฐ์', statusLabel: 'ค้างชำระเงิน' },
      ]),
    ).toBe('ค้างชำระเงิน 4 รายการ');
  });

  test('joins multiple status buckets with middle dot', () => {
    expect(
      formatPendingBeanOrdersSummary([
        { customerName: 'เอ', statusLabel: 'ค้างชำระเงิน' },
        { customerName: 'บี', statusLabel: 'ค้างจัดส่ง' },
      ]),
    ).toBe('ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 1 รายการ');
  });
});

describe('resolveInsightCronOccurredAt', () => {
  test('maps 17:00 ICT to 10:00 UTC for display', () => {
    expect(resolveInsightCronOccurredAt('2026-08-10')).toBe('2026-08-10T10:00:00.000Z');
  });
});
