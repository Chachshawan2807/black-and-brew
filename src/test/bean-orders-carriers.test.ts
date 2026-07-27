import { describe, expect, test } from 'vitest';
import {
  BEAN_ORDER_CARRIERS,
  getCarrierLabel,
  initialCarrierSelection,
  isTrackableCarrierCode,
  resolveCarrierCodeForSave,
} from '@/lib/bean-orders/carriers';

describe('isTrackableCarrierCode', () => {
  test('allows known carriers for TrackingMore sync', () => {
    expect(isTrackableCarrierCode('kerryexpress-th')).toBe(true);
    expect(isTrackableCarrierCode('flashexpress')).toBe(true);
    expect(isTrackableCarrierCode('thailand-post')).toBe(true);
  });

  test('rejects manual, custom, or non-TrackingMore carriers', () => {
    expect(isTrackableCarrierCode('other')).toBe(false);
    expect(isTrackableCarrierCode('lalamove')).toBe(false);
    expect(isTrackableCarrierCode('รถจัดส่งเอง')).toBe(false);
    expect(isTrackableCarrierCode(null)).toBe(false);
  });
});

describe('BEAN_ORDER_CARRIERS', () => {
  test('includes Lalamove as a selectable channel', () => {
    expect(BEAN_ORDER_CARRIERS.some((c) => c.code === 'lalamove' && c.label === 'Lalamove')).toBe(true);
    expect(getCarrierLabel('lalamove')).toBe('Lalamove');
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
    expect(initialCarrierSelection('lalamove')).toEqual({
      carrierCode: 'lalamove',
      customCarrierLabel: '',
    });
  });

  test('resolves other selection to trimmed custom label', () => {
    expect(resolveCarrierCodeForSave('other', ' รถส่งเอง ')).toBe('รถส่งเอง');
    expect(resolveCarrierCodeForSave('other', '   ')).toBeNull();
    expect(resolveCarrierCodeForSave('flashexpress', '')).toBe('flashexpress');
  });
});
