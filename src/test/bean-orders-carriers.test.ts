import { describe, expect, test } from 'vitest';
import {
  initialCarrierSelection,
  isTrackableCarrierCode,
  resolveCarrierCodeForSave,
} from '@/lib/bean-orders/carriers';

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

describe('carrier selection helpers', () => {
  test('maps stored custom carrier labels back to other + label', () => {
    expect(initialCarrierSelection('ลูกค้ามารับด้วยตัวเอง')).toEqual({
      carrierCode: 'other',
      customCarrierLabel: 'ลูกค้ามารับด้วยตัวเอง',
    });
  });

  test('keeps known carrier codes unchanged', () => {
    expect(initialCarrierSelection('kerryexpress-th')).toEqual({
      carrierCode: 'kerryexpress-th',
      customCarrierLabel: '',
    });
  });

  test('resolves other selection to trimmed custom label', () => {
    expect(resolveCarrierCodeForSave('other', ' รถส่งเอง ')).toBe('รถส่งเอง');
    expect(resolveCarrierCodeForSave('other', '   ')).toBeNull();
    expect(resolveCarrierCodeForSave('flashexpress', '')).toBe('flashexpress');
  });
});
