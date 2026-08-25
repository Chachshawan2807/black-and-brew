import { describe, expect, test } from 'vitest';
import { resolveCarrierCode } from '@/lib/bean-orders/carrier-codes';

describe('resolveCarrierCode', () => {
  test('maps legacy Kerry code to Kerry Express TH', () => {
    expect(resolveCarrierCode('kerry-logistics')).toBe('kerryexpress-th');
  });

  test('keeps correct codes unchanged', () => {
    expect(resolveCarrierCode('kerryexpress-th')).toBe('kerryexpress-th');
    expect(resolveCarrierCode('thailand-post')).toBe('thailand-post');
  });
});
