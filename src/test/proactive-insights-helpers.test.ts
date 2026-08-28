import { describe, expect, test } from 'vitest';
import {
  formatBeanOrderIncompleteStatusSummary,
  shouldIncludeIncompleteBeanOrder,
} from '@/lib/bean-orders/workflow-status';
import {
  formatBeanOrderPendingDetailSummary,
  resolvePendingBeanOrderStatusLabel,
} from '@/lib/proactive-insights/pending-bean-order-status';

describe('shouldIncludeIncompleteBeanOrder', () => {
  test('includes unpaid orders without slip', () => {
    expect(
      shouldIncludeIncompleteBeanOrder({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(true);
  });

  test('includes paid orders awaiting delivery', () => {
    expect(
      shouldIncludeIncompleteBeanOrder({
        paymentStatus: 'paid',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(true);
    expect(
      shouldIncludeIncompleteBeanOrder({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'in_transit',
      }),
    ).toBe(true);
  });

  test('excludes orders with settled payment and successful delivery', () => {
    expect(
      shouldIncludeIncompleteBeanOrder({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
      }),
    ).toBe(false);
    expect(
      shouldIncludeIncompleteBeanOrder({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
        slipUploadedAt: '2026-08-18T02:00:00.000Z',
      }),
    ).toBe(false);
  });

  test('includes unpaid without slip even when delivery already succeeded', () => {
    expect(
      shouldIncludeIncompleteBeanOrder({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
        slipUploadedAt: null,
      }),
    ).toBe(true);
  });
});

describe('resolvePendingBeanOrderStatusLabel', () => {
  test('lists every incomplete workflow status', () => {
    expect(resolvePendingBeanOrderStatusLabel('unpaid', 'pending')).toBe(
      'ค้างชำระเงิน, ค้างจัดส่ง',
    );
    expect(resolvePendingBeanOrderStatusLabel('paid', 'pending')).toBe('ค้างจัดส่ง');
    expect(resolvePendingBeanOrderStatusLabel('paid', 'shipped', null, 'delivered')).toBeNull();
  });

  test('shows payment backlog only after delivery succeeded', () => {
    expect(
      resolvePendingBeanOrderStatusLabel('unpaid', 'shipped', null, 'delivered'),
    ).toBe('ค้างชำระเงิน');
  });

  test('treats slip upload as settled payment for status label', () => {
    expect(resolvePendingBeanOrderStatusLabel('unpaid', 'pending', '2026-08-28T10:00:00.000Z')).toBe(
      'ค้างจัดส่ง',
    );
  });
});

describe('formatBeanOrderIncompleteStatusSummary', () => {
  test('shows every incomplete status line', () => {
    expect(
      formatBeanOrderIncompleteStatusSummary({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'pending',
        slipUploadedAt: null,
        trackingStatus: null,
      }),
    ).toBe('ชำระเงิน: ค้างชำระ · จัดส่ง: รอจัดส่ง');
  });

  test('omits payment line when slip uploaded (payment settled)', () => {
    expect(
      formatBeanOrderIncompleteStatusSummary({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'pending',
        slipUploadedAt: '2026-08-28T10:00:00.000Z',
        trackingStatus: null,
      }),
    ).toBe('จัดส่ง: รอจัดส่ง');
  });

  test('shows only unpaid line when delivered but payment still outstanding', () => {
    expect(
      formatBeanOrderIncompleteStatusSummary({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'shipped',
        slipUploadedAt: null,
        trackingStatus: 'delivered',
      }),
    ).toBe('ชำระเงิน: ค้างชำระ');
  });
});

describe('formatBeanOrderPendingDetailSummary', () => {
  test('delegates to workflow-status formatter', () => {
    const order = {
      paymentStatus: 'paid',
      fulfillmentStatus: 'pending',
      slipUploadedAt: null,
      trackingStatus: null,
    };
    expect(formatBeanOrderPendingDetailSummary(order)).toBe(
      formatBeanOrderIncompleteStatusSummary(order),
    );
  });
});
