import { describe, expect, test } from 'vitest';
import { shouldIncludeBeanOrderInPendingInsights } from '@/lib/proactive-insights/pending-bean-order-eligibility';

describe('shouldIncludeBeanOrderInPendingInsights', () => {
  test('includes unpaid orders without slip', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(true);
  });

  test('includes paid orders awaiting delivery', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'paid',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(true);
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'in_transit',
      }),
    ).toBe(true);
  });

  test('excludes orders with settled payment and successful delivery', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
      }),
    ).toBe(false);
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
        slipUploadedAt: '2026-08-18T02:00:00.000Z',
      }),
    ).toBe(false);
  });

  test('includes unpaid without slip even when delivery already succeeded', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
        slipUploadedAt: null,
      }),
    ).toBe(true);
  });

  test('includes slip-uploaded orders while delivery is still outstanding', () => {
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
        trackingStatus: 'in_transit',
      }),
    ).toBe(true);
  });
});
