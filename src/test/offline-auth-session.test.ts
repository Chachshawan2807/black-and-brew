import { beforeEach, describe, expect, test } from 'vitest';
import {
  OFFLINE_AUTH_SESSION_STORAGE_KEY,
  clearClientOfflineAuthSessionId,
  getClientOfflineAuthSessionId,
  isOfflineMutationOwnedByCurrentSession,
  offlineMutationAuthSessionError,
  setClientOfflineAuthSessionId,
} from '@/lib/offline-auth-session';
import { OFFLINE_AUTH_SESSION_COOKIE } from '@/lib/auth-constants';

describe('offline-auth-session', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('stores offline auth session id in sessionStorage', () => {
    setClientOfflineAuthSessionId('auth-a');
    expect(sessionStorage.getItem(OFFLINE_AUTH_SESSION_STORAGE_KEY)).toBe('auth-a');
    expect(getClientOfflineAuthSessionId()).toBe('auth-a');
  });

  test('clearClientOfflineAuthSessionId removes stored id', () => {
    setClientOfflineAuthSessionId('auth-a');
    clearClientOfflineAuthSessionId();
    expect(getClientOfflineAuthSessionId()).toBe('');
  });

  test('isOfflineMutationOwnedByCurrentSession rejects legacy and foreign mutations', () => {
    expect(
      isOfflineMutationOwnedByCurrentSession({ authSessionId: 'auth-a' }, 'auth-a'),
    ).toBe(true);
    expect(
      isOfflineMutationOwnedByCurrentSession({ authSessionId: 'auth-a' }, 'auth-b'),
    ).toBe(false);
    expect(isOfflineMutationOwnedByCurrentSession({}, 'auth-a')).toBe(false);
    expect(isOfflineMutationOwnedByCurrentSession({ authSessionId: 'auth-a' }, '')).toBe(false);
  });

  test('offlineMutationAuthSessionError blocks stale and mismatched replays', () => {
    expect(offlineMutationAuthSessionError({ authSessionId: 'auth-a' }, 'auth-a')).toBeNull();
    expect(offlineMutationAuthSessionError({}, 'auth-a')).toBe('Stale offline mutation');
    expect(offlineMutationAuthSessionError({ authSessionId: 'auth-a' }, 'auth-b')).toBe(
      'Offline mutation session mismatch',
    );
    expect(offlineMutationAuthSessionError({ authSessionId: 'auth-a' }, undefined)).toBe(
      'Offline auth session expired',
    );
  });

  test('uses dedicated offline auth session cookie name', () => {
    expect(OFFLINE_AUTH_SESSION_COOKIE).toBe('bb_offline_auth_sid');
  });
});
