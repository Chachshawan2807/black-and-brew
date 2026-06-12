import { beforeEach, describe, expect, test } from 'vitest';
import { AUTH_SESSION_MAX_AGE_SEC } from '@/lib/auth-constants';
import {
  AUTH_EXPIRES_AT_KEY,
  AUTH_PIN_VERIFIED_KEY,
  AUTH_READ_ONLY_KEY,
  clearClientAuthSession,
  isClientAuthVerified,
  isClientReadOnly,
  setClientAuthSession,
} from '@/lib/client-auth-storage';

describe('client-auth-storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('persists verified session in localStorage', () => {
    setClientAuthSession(false);
    expect(localStorage.getItem(AUTH_PIN_VERIFIED_KEY)).toBe('true');
    expect(isClientAuthVerified()).toBe(true);
    expect(isClientReadOnly()).toBe(false);
  });

  test('persists read-only flag', () => {
    setClientAuthSession(true);
    expect(localStorage.getItem(AUTH_READ_ONLY_KEY)).toBe('true');
    expect(isClientReadOnly()).toBe(true);
  });

  test('expires client session after max age', () => {
    setClientAuthSession(false);
    localStorage.setItem(
      AUTH_EXPIRES_AT_KEY,
      String(Date.now() - AUTH_SESSION_MAX_AGE_SEC * 1000)
    );
    expect(isClientAuthVerified()).toBe(false);
  });

  test('clearClientAuthSession removes all auth keys', () => {
    setClientAuthSession(true);
    sessionStorage.setItem(AUTH_PIN_VERIFIED_KEY, 'true');
    clearClientAuthSession();
    expect(isClientAuthVerified()).toBe(false);
    expect(isClientReadOnly()).toBe(false);
    expect(sessionStorage.getItem(AUTH_PIN_VERIFIED_KEY)).toBeNull();
  });
});
