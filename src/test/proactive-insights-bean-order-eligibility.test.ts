import { describe, expect, test } from 'vitest';
import { shouldIncludeBeanOrderInPendingInsights } from '@/lib/proactive-insights/pending-bean-order-eligibility';

describe('shouldIncludeBeanOrderInPendingInsights', () => {
  test('includes unpaid and pending-fulfillment orders', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(true);
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'paid',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(true);
  });

  test('excludes paid shipped orders awaiting delivery confirmation', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: null,
      }),
    ).toBe(false);
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'in_transit',
      }),
    ).toBe(false);
  });

  test('excludes delivered paid shipped orders', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
      }),
    ).toBe(false);
  });

  test('still includes legacy unpaid shipped orders in fetch list', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'shipped',
      }),
    ).toBe(true);
  });

  test('excludes unpaid orders with uploaded slip from payment queue', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'pending',
        slipUploadedAt: '2026-08-18T02:00:00.000Z',
      }),
    ).toBe(true);
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'shipped',
        slipUploadedAt: '2026-08-18T02:00:00.000Z',
      }),
    ).toBe(false);
  });
});
