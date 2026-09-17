import { describe, expect, test, beforeEach } from 'vitest';
import { getClientSessionId, isOwnChange } from '@/lib/client-session';

describe('getClientSessionId', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('returns stable id within same tab', () => {
    const a = getClientSessionId();
    const b = getClientSessionId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  test('persists id in localStorage across reloads', () => {
    const first = getClientSessionId();
    localStorage.clear();
    localStorage.setItem('bb_client_session_id', first);
    expect(getClientSessionId()).toBe(first);
  });

  test('migrates legacy sessionStorage id into localStorage', () => {
    sessionStorage.setItem('bb_client_session_id', 'legacy-session-id');
    expect(getClientSessionId()).toBe('legacy-session-id');
    expect(localStorage.getItem('bb_client_session_id')).toBe('legacy-session-id');
    expect(sessionStorage.getItem('bb_client_session_id')).toBeNull();
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
