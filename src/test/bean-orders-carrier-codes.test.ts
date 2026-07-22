import { describe, expect, test } from 'vitest';
import {
  isStaleTrackingStatus,
  resolveTrackingMoreCarrierCode,
} from '@/lib/bean-orders/carrier-codes';

describe('resolveTrackingMoreCarrierCode', () => {
  test('maps legacy Kerry code to Kerry Express TH', () => {
    expect(resolveTrackingMoreCarrierCode('kerry-logistics')).toBe('kerryexpress-th');
  });

  test('keeps correct codes unchanged', () => {
    expect(resolveTrackingMoreCarrierCode('kerryexpress-th')).toBe('kerryexpress-th');
    expect(resolveTrackingMoreCarrierCode('thailand-post')).toBe('thailand-post');
  });
});

describe('isStaleTrackingStatus', () => {
  test('treats pending and registered as stale', () => {
    expect(isStaleTrackingStatus('pending')).toBe(true);
    expect(isStaleTrackingStatus('registered')).toBe(true);
    expect(isStaleTrackingStatus('transit')).toBe(false);
    expect(isStaleTrackingStatus('delivered')).toBe(false);
  });
});
