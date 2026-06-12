/** Client-side PIN session flags — aligned with server cookie max-age. */

import { AUTH_SESSION_MAX_AGE_SEC } from '@/lib/auth-constants';

export const AUTH_PIN_VERIFIED_KEY = 'bb_auth_pin_verified';
export const AUTH_READ_ONLY_KEY = 'bb_auth_read_only';
export const AUTH_EXPIRES_AT_KEY = 'bb_auth_expires_at';

function isExpired(): boolean {
  const raw = localStorage.getItem(AUTH_EXPIRES_AT_KEY);
  if (!raw) return false;
  return Date.now() > Number(raw);
}

export function isClientAuthVerified(): boolean {
  if (typeof window === 'undefined') return false;
  if (isExpired()) {
    clearClientAuthSession();
    return false;
  }
  return localStorage.getItem(AUTH_PIN_VERIFIED_KEY) === 'true';
}

export function isClientReadOnly(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_READ_ONLY_KEY) === 'true';
}

export function setClientAuthSession(readOnly: boolean): void {
  if (typeof window === 'undefined') return;
  const expiresAt = Date.now() + AUTH_SESSION_MAX_AGE_SEC * 1000;
  localStorage.setItem(AUTH_PIN_VERIFIED_KEY, 'true');
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(expiresAt));
  if (readOnly) {
    localStorage.setItem(AUTH_READ_ONLY_KEY, 'true');
  } else {
    localStorage.removeItem(AUTH_READ_ONLY_KEY);
  }
  sessionStorage.removeItem(AUTH_PIN_VERIFIED_KEY);
  sessionStorage.removeItem(AUTH_READ_ONLY_KEY);
}

export function clearClientAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_PIN_VERIFIED_KEY);
  localStorage.removeItem(AUTH_READ_ONLY_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  sessionStorage.removeItem(AUTH_PIN_VERIFIED_KEY);
  sessionStorage.removeItem(AUTH_READ_ONLY_KEY);
}
