import { describe, expect, test } from 'vitest';
import {
  shouldResetBeanOrderTrackingOnShip,
  shouldSyncBeanOrderTrackingAfterShip,
} from '@/lib/bean-orders/shipment-tracking-preserve';

describe('shouldResetBeanOrderTrackingOnShip', () => {
  const existing = {
    carrierCode: 'kerryexpress-th',
    trackingNumber: 'KEX180019122878',
    trackingStatus: 'delivered',
  };

  test('resets on first ship', () => {
    expect(
      shouldResetBeanOrderTrackingOnShip(null, existing, true),
    ).toBe(true);
  });

  test('preserves tracking when shipment update repeats same carrier and number', () => {
    expect(
      shouldResetBeanOrderTrackingOnShip(existing, existing, false),
    ).toBe(false);
  });

  test('resets when tracking number changes', () => {
    expect(
      shouldResetBeanOrderTrackingOnShip(existing, {
        carrierCode: 'kerryexpress-th',
        trackingNumber: 'KEX999999999999',
      }, false),
    ).toBe(true);
  });

  test('resets when carrier changes', () => {
    expect(
      shouldResetBeanOrderTrackingOnShip(existing, {
        carrierCode: 'flashexpress',
        trackingNumber: 'KEX180019122878',
      }, false),
    ).toBe(true);
  });

  test('treats legacy kerry-logistics as same carrier as kerryexpress-th', () => {
    expect(
      shouldResetBeanOrderTrackingOnShip(
        { ...existing, carrierCode: 'kerry-logistics' },
        { carrierCode: 'kerryexpress-th', trackingNumber: 'KEX180019122878' },
        false,
      ),
    ).toBe(false);
  });
});

describe('shouldSyncBeanOrderTrackingAfterShip', () => {
  test('skips sync for non-trackable carriers', () => {
    expect(shouldSyncBeanOrderTrackingAfterShip(false, true, null)).toBe(false);
  });

  test('syncs when tracking identity changed', () => {
    expect(shouldSyncBeanOrderTrackingAfterShip(true, true, 'delivered')).toBe(true);
  });

  test('skips sync when cached status is already delivered', () => {
    expect(shouldSyncBeanOrderTrackingAfterShip(true, false, 'delivered')).toBe(false);
  });

  test('syncs when cached status is still stale', () => {
    expect(shouldSyncBeanOrderTrackingAfterShip(true, false, null)).toBe(true);
    expect(shouldSyncBeanOrderTrackingAfterShip(true, false, 'pending')).toBe(true);
  });
});
