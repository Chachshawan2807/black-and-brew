import { describe, expect, test } from 'vitest';
import {
  countBeanOrderPendingStatuses,
  formatPendingBeanOrdersSummary,
} from '@/lib/proactive-insights/format-pending-bean-orders';
import { resolveInsightCronOccurredAt } from '@/lib/proactive-insights/insight-schedule';

describe('countBeanOrderPendingStatuses', () => {
  test('counts unpaid and pending shipment independently', () => {
    expect(
      countBeanOrderPendingStatuses([
        { paymentStatus: 'unpaid', fulfillmentStatus: 'pending' },
        { paymentStatus: 'paid', fulfillmentStatus: 'pending' },
        { paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
      ]),
    ).toEqual({ unpaidCount: 1, pendingShipmentCount: 2, awaitingDeliveryCount: 0 });
  });

  test('counts paid shipped undelivered orders as awaiting delivery', () => {
    expect(
      countBeanOrderPendingStatuses([
        {
          paymentStatus: 'paid',
          fulfillmentStatus: 'shipped',
          trackingStatus: null,
        },
        {
          paymentStatus: 'paid',
          fulfillmentStatus: 'shipped',
          trackingStatus: 'delivered',
        },
      ]),
    ).toEqual({ unpaidCount: 0, pendingShipmentCount: 0, awaitingDeliveryCount: 1 });
  });
});

describe('formatPendingBeanOrdersSummary', () => {
  test('shows payment, shipment, and awaiting-delivery counts', () => {
    expect(
      formatPendingBeanOrdersSummary([
        { customerName: 'เอ', paymentStatus: 'unpaid', fulfillmentStatus: 'pending' },
        { customerName: 'บี', paymentStatus: 'paid', fulfillmentStatus: 'pending' },
        { customerName: 'ซี', paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
        {
          customerName: 'ลี',
          paymentStatus: 'paid',
          fulfillmentStatus: 'shipped',
          trackingStatus: null,
        },
      ]),
    ).toBe('ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 2 รายการ · รอส่งมอบ 1 รายการ');
  });

  test('omits zero buckets', () => {
    expect(
      formatPendingBeanOrdersSummary([
        { customerName: 'ทศกัณฐ์', paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
        { customerName: 'ทศกัณฐ์', paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
      ]),
    ).toBe('');
  });
});

describe('resolveInsightCronOccurredAt', () => {
  test('maps 07:00 ICT to 00:00 UTC for display', () => {
    expect(resolveInsightCronOccurredAt('2026-08-10')).toBe('2026-08-10T00:00:00.000Z');
  });
});
