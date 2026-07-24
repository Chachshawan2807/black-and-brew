import { describe, expect, test } from 'vitest';
import { verifyBearerSecret } from '@/lib/security/bearer-auth';

describe('verifyBearerSecret', () => {
  test('accepts matching bearer token', () => {
    expect(verifyBearerSecret('Bearer test-secret', 'test-secret')).toBe(true);
  });

  test('rejects missing header', () => {
    expect(verifyBearerSecret(null, 'test-secret')).toBe(false);
  });

  test('rejects missing secret', () => {
    expect(verifyBearerSecret('Bearer test-secret', null)).toBe(false);
  });

  test('rejects wrong secret', () => {
    expect(verifyBearerSecret('Bearer wrong', 'test-secret')).toBe(false);
  });

  test('rejects raw secret without Bearer prefix', () => {
    expect(verifyBearerSecret('test-secret', 'test-secret')).toBe(false);
  });

  test('rejects different-length values without throwing', () => {
    expect(verifyBearerSecret('Bearer short', 'much-longer-secret-value')).toBe(false);
  });
});
