'use server';

import { cookies } from 'next/headers';
import {
  AUTH_SESSION_MAX_AGE_SEC,
  FORCE_LOGOUT_DENY_MSG,
  READ_ONLY_DENY_MSG,
  SESSION_FP_COOKIE,
} from '@/lib/auth-constants';
import { recordLoginEvent } from '@/app/actions/login-history-actions';
import type { ClientDevicePayload } from '@/lib/login-history-types';
import {
  clearSessionRevocation,
  isSessionFingerprintRevoked,
  revokeSessionFingerprints,
} from '@/lib/session-revocation';
import {
  clearPinAttempts,
  formatPinLockoutMessage,
  getPinLockoutStatus,
  recordPinFailure,
} from '@/lib/security/pin-rate-limit';
import { resolveClientIp } from '@/lib/security/request-ip';
import { resolveReadOnlyPin } from '@/lib/security/read-only-pin';

const getCookieOpts = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: AUTH_SESSION_MAX_AGE_SEC,
  path: '/',
});

async function assertMasterPin(
  pin: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clientIp = await resolveClientIp();
  const lockout = getPinLockoutStatus(clientIp);
  if (!lockout.allowed) {
    return { ok: false, error: formatPinLockoutMessage(lockout.resetAt) };
  }

  const systemPin = process.env.APP_PIN;
  if (!systemPin) {
    console.error('[AUTH_ACTION] APP_PIN environment variable is not defined.');
    return { ok: false, error: 'System configuration error' };
  }
  if (pin !== systemPin) {
    const failure = recordPinFailure(clientIp);
    if (!failure.allowed) {
      return { ok: false, error: formatPinLockoutMessage(failure.resetAt) };
    }
    return { ok: false, error: FORCE_LOGOUT_DENY_MSG };
  }

  clearPinAttempts(clientIp);
  return { ok: true };
}

function setAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
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

function clearAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.delete('bb_auth_pin_verified');
  cookieStore.delete('bb_auth_read_only');
  cookieStore.delete(SESSION_FP_COOKIE);
}

async function resolveAuthSession(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): Promise<{ verified: boolean; readOnly: boolean }> {
  const verified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';
  if (!verified) {
    return { verified: false, readOnly: false };
  }

  const fingerprint = cookieStore.get(SESSION_FP_COOKIE)?.value;
  if (fingerprint && (await isSessionFingerprintRevoked(fingerprint))) {
    clearAuthCookies(cookieStore);
    return { verified: false, readOnly: false };
  }

  return {
    verified: true,
    readOnly: cookieStore.get('bb_auth_read_only')?.value === 'true',
  };
}

export async function verifyPin(
  pin: string,
  device?: ClientDevicePayload | null
): Promise<{ success: boolean; error?: string; isReadOnly?: boolean }> {
  const clientIp = await resolveClientIp();
  const lockout = getPinLockoutStatus(clientIp);
  if (!lockout.allowed) {
    return { success: false, error: formatPinLockoutMessage(lockout.resetAt) };
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const systemPin = process.env.APP_PIN;
  if (!systemPin) {
    console.error('[AUTH_ACTION] APP_PIN environment variable is not defined.');
    return { success: false, error: 'System configuration error' };
  }

  const readOnlyPin = resolveReadOnlyPin();
  const cookieStore = await cookies();

  if (readOnlyPin && pin === readOnlyPin) {
    clearPinAttempts(clientIp);
    if (device?.sessionFingerprint) {
      await clearSessionRevocation(device.sessionFingerprint);
    }
    setAuthCookies(cookieStore, true, device);
    await recordLoginEvent({
      eventType: 'login_success',
      status: 'success',
      device,
      accessLevel: 'read_only',
    });
    return { success: true, isReadOnly: true };
  }

  if (pin === systemPin) {
    clearPinAttempts(clientIp);
    if (device?.sessionFingerprint) {
      await clearSessionRevocation(device.sessionFingerprint);
    }
    setAuthCookies(cookieStore, false, device);
    await recordLoginEvent({
      eventType: 'login_success',
      status: 'success',
      device,
      accessLevel: 'full',
    });
    return { success: true, isReadOnly: false };
  }

  const failure = recordPinFailure(clientIp);
  await recordLoginEvent({
    eventType: 'login_failure',
    status: 'failure',
    device,
    failureReason: 'Invalid PIN',
  });

  if (!failure.allowed) {
    return { success: false, error: formatPinLockoutMessage(failure.resetAt) };
  }

  return { success: false, error: 'รหัส PIN ไม่ถูกต้อง' };
}

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = await resolveAuthSession(cookieStore);
  return session.verified;
}

export async function getAuthSessionInfo(): Promise<{
  verified: boolean;
  readOnly: boolean;
}> {
  const cookieStore = await cookies();
  return resolveAuthSession(cookieStore);
}

export async function getCurrentSessionFingerprint(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_FP_COOKIE)?.value ?? null;
}

async function isReadOnlySession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('bb_auth_read_only')?.value === 'true';
}

export async function assertWritableSession(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (await isReadOnlySession()) {
    return { ok: false, error: READ_ONLY_DENY_MSG };
  }
  return { ok: true };
}

export async function clearAuth(device?: ClientDevicePayload | null): Promise<void> {
  const cookieStore = await cookies();
  const wasVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';
  const readOnly = cookieStore.get('bb_auth_read_only')?.value === 'true';

  if (wasVerified) {
    await recordLoginEvent({
      eventType: 'logout',
      status: 'success',
      device,
      accessLevel: readOnly ? 'read_only' : 'full',
    });
  }

  clearAuthCookies(cookieStore);
}

/** Revoke one remote device session (master PIN required). */
export async function forceRevokeDeviceSession(
  pin: string,
  sessionFingerprint: string,
  actorDevice?: ClientDevicePayload | null
): Promise<{ success: boolean; error?: string }> {
  const gate = await assertMasterPin(pin);
  if (!gate.ok) return { success: false, error: gate.error };

  if (!sessionFingerprint) {
    return { success: false, error: 'ไม่พบข้อมูลอุปกรณ์' };
  }

  const currentFp = actorDevice?.sessionFingerprint ?? (await getCurrentSessionFingerprint());
  if (sessionFingerprint === currentFp) {
    return {
      success: false,
      error: 'ใช้เมนูออกจากระบบสำหรับเครื่องนี้ — บังคับออกใช้กับอุปกรณ์อื่น',
    };
  }

  try {
    await revokeSessionFingerprints([sessionFingerprint], 'forced_by_master');
    await recordLoginEvent({
      eventType: 'logout',
      status: 'success',
      device: {
        userAgent: 'remote-revoke',
        screenWidth: 0,
        screenHeight: 0,
        language: 'th',
        timezone: 'Asia/Bangkok',
        sessionFingerprint,
      },
      accessLevel: 'full',
    });
    return { success: true };
  } catch {
    return { success: false, error: 'บังคับออกจากระบบไม่สำเร็จ' };
  }
}

/** Revoke all active remote sessions except the current device. */
export async function forceRevokeAllRemoteSessions(
  pin: string,
  sessionFingerprints: string[],
  actorDevice?: ClientDevicePayload | null
): Promise<{ success: boolean; error?: string; revokedCount?: number }> {
  const gate = await assertMasterPin(pin);
  if (!gate.ok) return { success: false, error: gate.error };

  const currentFp = actorDevice?.sessionFingerprint ?? (await getCurrentSessionFingerprint());
  const targets = sessionFingerprints.filter((fp) => fp && fp !== currentFp);

  if (targets.length === 0) {
    return { success: true, revokedCount: 0 };
  }

  try {
    await revokeSessionFingerprints(targets, 'forced_by_master_all');
    for (const fp of targets) {
      await recordLoginEvent({
        eventType: 'logout',
        status: 'success',
        device: {
          userAgent: 'remote-revoke',
          screenWidth: 0,
          screenHeight: 0,
          language: 'th',
          timezone: 'Asia/Bangkok',
          sessionFingerprint: fp,
        },
        accessLevel: 'full',
      });
    }
    return { success: true, revokedCount: targets.length };
  } catch {
    return { success: false, error: 'บังคับออกจากระบบไม่สำเร็จ' };
  }
}
