import { describe, expect, test } from 'vitest';
import { isTrackableCarrierCode } from '@/lib/bean-orders/carriers';

describe('isTrackableCarrierCode', () => {
  test('allows known carriers for TrackingMore sync', () => {
    expect(isTrackableCarrierCode('kerryexpress-th')).toBe(true);
    expect(isTrackableCarrierCode('flashexpress')).toBe(true);
  });

  test('rejects manual or custom carrier labels', () => {
    expect(isTrackableCarrierCode('other')).toBe(false);
    expect(isTrackableCarrierCode('รถจัดส่งเอง')).toBe(false);
    expect(isTrackableCarrierCode(null)).toBe(false);
  });
});
