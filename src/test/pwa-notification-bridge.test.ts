import { describe, expect, test } from 'vitest';
import { isUuidString } from '@/lib/pwa-notification-bridge';

describe('pwa-notification-bridge', () => {
  test('isUuidString detects uuid values', () => {
    expect(isUuidString('918198da-d6b9-4272-9474-e28acf5e88cb')).toBe(true);
    expect(isUuidString('ทดสอบ')).toBe(false);
    expect(isUuidString(42)).toBe(false);
  });
});
