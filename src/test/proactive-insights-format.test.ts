import { describe, expect, test } from 'vitest';
import {
  countBeanOrderPendingStatuses,
  formatPendingBeanOrdersSummary,
} from '@/lib/proactive-insights/format-pending-bean-orders';
import { resolvePendingBeanOrderStatusLabel } from '@/lib/proactive-insights/pending-bean-order-status';
import { resolveInsightCronOccurredAt } from '@/lib/proactive-insights/insight-schedule';

function expectCountsAlignedWithStatusLabels(
  orders: Parameters<typeof countBeanOrderPendingStatuses>[0],
): void {
  const counts = countBeanOrderPendingStatuses(orders);
  let expectedUnpaid = 0;
  let expectedShipment = 0;

  for (const order of orders) {
    const label = resolvePendingBeanOrderStatusLabel(
      order.paymentStatus,
      order.fulfillmentStatus,
      order.slipUploadedAt,
      order.trackingStatus,
    );
    if (label?.includes('ค้างชำระเงิน')) expectedUnpaid += 1;
    if (label?.includes('ค้างจัดส่ง')) expectedShipment += 1;
  }

  expect(counts).toEqual({
    unpaidCount: expectedUnpaid,
    pendingShipmentCount: expectedShipment,
  });
}

describe('countBeanOrderPendingStatuses', () => {
  test('counts unpaid and pending shipment independently', () => {
    const orders = [
      { paymentStatus: 'unpaid', fulfillmentStatus: 'pending' },
      { paymentStatus: 'paid', fulfillmentStatus: 'pending' },
      { paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
    ];
    expect(countBeanOrderPendingStatuses(orders)).toEqual({
      unpaidCount: 2,
      pendingShipmentCount: 3,
    });
    expectCountsAlignedWithStatusLabels(orders);
  });

  test('counts payment backlog after delivery and shipment backlog after ship', () => {
    const orders = [
      {
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
      },
      { paymentStatus: 'paid', fulfillmentStatus: 'pending' },
    ];
    expect(formatPendingBeanOrdersSummary(orders)).toBe(
      'ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 1 รายการ',
    );
    expectCountsAlignedWithStatusLabels(orders);
  });

  test('ignores fully completed orders', () => {
    expect(
      countBeanOrderPendingStatuses([
        {
          paymentStatus: 'paid',
          fulfillmentStatus: 'shipped',
          trackingStatus: 'delivered',
        },
      ]),
    ).toEqual({ unpaidCount: 0, pendingShipmentCount: 0 });
  });

  test('counts paid shipped undelivered orders as pending shipment only', () => {
    expect(
      countBeanOrderPendingStatuses([
        {
          paymentStatus: 'paid',
          fulfillmentStatus: 'shipped',
          trackingStatus: null,
        },
      ]),
    ).toEqual({ unpaidCount: 0, pendingShipmentCount: 1 });
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
    ).toBe('ค้างชำระเงิน 2 รายการ · ค้างจัดส่ง 4 รายการ');
  });

  test('reports both buckets when payment and shipment backlogs come from different orders', () => {
    expect(
      formatPendingBeanOrdersSummary([
        {
          customerName: 'ค้างชำระ',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'shipped',
          trackingStatus: 'delivered',
        },
        { customerName: 'ค้างจัดส่ง', paymentStatus: 'paid', fulfillmentStatus: 'pending' },
      ]),
    ).toBe('ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 1 รายการ');
  });

  test('reports unpaid shipped in-transit orders in both buckets', () => {
    expect(
      formatPendingBeanOrdersSummary([
        {
          customerName: 'ทัพพ์',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'shipped',
          trackingStatus: 'in_transit',
        },
        { customerName: 'มุก', paymentStatus: 'paid', fulfillmentStatus: 'pending' },
      ]),
    ).toBe('ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 2 รายการ');
  });

  test('omits zero buckets', () => {
    expect(
      formatPendingBeanOrdersSummary([
        { customerName: 'ทศกัณฐ์', paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
        { customerName: 'ทศกัณฐ์', paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
      ]),
    ).toBe('ค้างชำระเงิน 2 รายการ · ค้างจัดส่ง 2 รายการ');
  });
});

describe('resolveInsightCronOccurredAt', () => {
  test('maps 07:00 ICT to 00:00 UTC for display', () => {
    expect(resolveInsightCronOccurredAt('2026-08-10')).toBe('2026-08-10T00:00:00.000Z');
  });
});
