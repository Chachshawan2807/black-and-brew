/** Per-login offline mutation auth binding (client storage + server cookie). */

import { OFFLINE_AUTH_SESSION_COOKIE } from '@/lib/auth-constants';

export { OFFLINE_AUTH_SESSION_COOKIE };

export const OFFLINE_AUTH_SESSION_STORAGE_KEY = 'bb_offline_auth_sid';

export function createOfflineAuthSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `offline-auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function setClientOfflineAuthSessionId(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    sessionStorage.setItem(OFFLINE_AUTH_SESSION_STORAGE_KEY, id);
  } catch {
    // sessionStorage may be unavailable in private mode
  }
}

export function getClientOfflineAuthSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(OFFLINE_AUTH_SESSION_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function clearClientOfflineAuthSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(OFFLINE_AUTH_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isOfflineMutationOwnedByCurrentSession(
  mutation: { authSessionId?: string },
  currentAuthSessionId: string | null | undefined,
): boolean {
  if (!currentAuthSessionId) return false;
  if (!mutation.authSessionId) return false;
  return mutation.authSessionId === currentAuthSessionId;
}

export function offlineMutationAuthSessionError(
  mutation: { authSessionId?: string },
  cookieValue: string | undefined,
): string | null {
  if (!cookieValue) return 'Offline auth session expired';
  if (!mutation.authSessionId) return 'Stale offline mutation';
  if (mutation.authSessionId !== cookieValue) return 'Offline mutation session mismatch';
  return null;
}
