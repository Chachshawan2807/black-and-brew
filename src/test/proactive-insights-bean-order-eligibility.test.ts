import { describe, expect, test } from 'vitest';
import {
  isAwaitingBeanOrderDelivery,
  shouldIncludeBeanOrderInPendingInsights,
} from '@/lib/proactive-insights/pending-bean-order-eligibility';

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

  test('includes paid shipped orders that are not delivered yet', () => {
    expect(
      shouldIncludeBeanOrderInPendingInsights({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: null,
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
});

describe('isAwaitingBeanOrderDelivery', () => {
  test('detects paid shipped pickup/parcel orders awaiting delivery confirmation', () => {
    expect(
      isAwaitingBeanOrderDelivery({
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: null,
      }),
    ).toBe(true);
    expect(
      isAwaitingBeanOrderDelivery({
        paymentStatus: 'paid',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(false);
  });
});
