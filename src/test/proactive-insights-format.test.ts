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
    ).toEqual({ unpaidCount: 1, pendingShipmentCount: 2 });
  });

  test('ignores paid shipped undelivered orders', () => {
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
    ).toEqual({ unpaidCount: 0, pendingShipmentCount: 0 });
  });

  test('does not count slip-uploaded unpaid orders as awaiting payment', () => {
    expect(
      countBeanOrderPendingStatuses([
        {
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'pending',
          slipUploadedAt: '2026-08-18T02:00:00.000Z',
        },
      ]),
    ).toEqual({ unpaidCount: 0, pendingShipmentCount: 1 });
    expect(
      formatPendingBeanOrdersSummary([
        {
          customerName: 'ลูกค้า',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'pending',
          slipUploadedAt: '2026-08-18T02:00:00.000Z',
        },
      ]),
    ).toBe('ค้างจัดส่ง 1 รายการ');
  });
});

describe('formatPendingBeanOrdersSummary', () => {
  test('shows payment and shipment counts only', () => {
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
    ).toBe('ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 2 รายการ');
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
