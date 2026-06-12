import { describe, expect, test, beforeEach } from 'vitest';
import { getClientSessionId, isOwnChange } from '@/lib/client-session';

describe('getClientSessionId', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('returns stable id within same tab', () => {
    const a = getClientSessionId();
    const b = getClientSessionId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  test('generates new id when storage is empty', () => {
    const id = getClientSessionId();
    expect(id.length).toBeGreaterThan(8);
  });
});

describe('isOwnChange', () => {
  test('matches clientSessionId in metadata', () => {
    expect(isOwnChange({ clientSessionId: 'abc' }, 'abc')).toBe(true);
    expect(isOwnChange({ clientSessionId: 'abc' }, 'xyz')).toBe(false);
  });

  test('returns false for missing metadata', () => {
    expect(isOwnChange(undefined, 'abc')).toBe(false);
  });
});
