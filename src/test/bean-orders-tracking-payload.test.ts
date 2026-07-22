import { describe, expect, test } from 'vitest';
import {
  extractDeliveryStatus,
  inferCarrierFromTrackingNumber,
  normalizeTrackingMoreData,
} from '@/lib/bean-orders/tracking-payload';

describe('normalizeTrackingMoreData', () => {
  test('returns null for empty data array', () => {
    expect(normalizeTrackingMoreData({ data: [] })).toBeNull();
  });

  test('reads first item from data array', () => {
    expect(
      normalizeTrackingMoreData({
        data: [{ delivery_status: 'transit', tracking_number: 'A' }],
      }),
    ).toEqual({ delivery_status: 'transit', tracking_number: 'A' });
  });

  test('reads nested data object', () => {
    expect(
      normalizeTrackingMoreData({
        data: { delivery_status: 'delivered' },
      }),
    ).toEqual({ delivery_status: 'delivered' });
  });
});

describe('extractDeliveryStatus', () => {
  test('prefers delivery_status', () => {
    expect(extractDeliveryStatus({ delivery_status: 'pickup', status: 'pending' })).toBe('pickup');
  });
});

describe('inferCarrierFromTrackingNumber', () => {
  test('maps KEX numbers to Kerry Express TH', () => {
    expect(inferCarrierFromTrackingNumber('KEX180018145006')).toBe('kerryexpress-th');
  });
});
