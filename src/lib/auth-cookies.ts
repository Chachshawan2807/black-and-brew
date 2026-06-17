import type { ClientDevicePayload } from '@/lib/login-history-types';
import { AUTH_SESSION_MAX_AGE_SEC, SESSION_FP_COOKIE } from '@/lib/auth-constants';

export type AuthCookieStore = {
  set: (name: string, value: string, options: Record<string, unknown>) => void;
  delete: (name: string) => void;
  get: (name: string) => { value: string } | undefined;
};

export const getCookieOpts = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: AUTH_SESSION_MAX_AGE_SEC,
  path: '/',
});

export function setAuthCookies(
  cookieStore: AuthCookieStore,
  readOnly: boolean,
  device?: ClientDevicePayload | null
) {
  cookieStore.set('bb_auth_pin_verified', 'true', getCookieOpts());
  if (readOnly) {
    cookieStore.set('bb_auth_read_only', 'true', getCookieOpts());
  } else {
    cookieStore.delete('bb_auth_read_only');
  }
  if (device?.sessionFingerprint) {
    cookieStore.set(SESSION_FP_COOKIE, device.sessionFingerprint, getCookieOpts());
  }
}

export function clearAuthCookies(cookieStore: AuthCookieStore) {
  cookieStore.delete('bb_auth_pin_verified');
  cookieStore.delete('bb_auth_read_only');
  cookieStore.delete(SESSION_FP_COOKIE);
}
