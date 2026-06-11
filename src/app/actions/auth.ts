'use server';

import { cookies } from 'next/headers';
import { READ_ONLY_PIN, READ_ONLY_DENY_MSG } from '@/lib/auth-constants';
import { recordLoginEvent } from '@/app/actions/login-history-actions';
import type { ClientDevicePayload } from '@/lib/login-history-types';

const getCookieOpts = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24,
  path: '/',
});

export async function verifyPin(
  pin: string,
  device?: ClientDevicePayload | null
): Promise<{ success: boolean; error?: string; isReadOnly?: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const systemPin = process.env.APP_PIN;
  if (!systemPin) {
    console.error('[AUTH_ACTION] APP_PIN environment variable is not defined.');
    return { success: false, error: 'System configuration error' };
  }

  const cookieStore = await cookies();

  if (pin === READ_ONLY_PIN) {
    cookieStore.set('bb_auth_pin_verified', 'true', getCookieOpts());
    cookieStore.set('bb_auth_read_only', 'true', getCookieOpts());
    await recordLoginEvent({
      eventType: 'login_success',
      status: 'success',
      device,
      accessLevel: 'read_only',
    });
    return { success: true, isReadOnly: true };
  }

  if (pin === systemPin) {
    cookieStore.set('bb_auth_pin_verified', 'true', getCookieOpts());
    cookieStore.delete('bb_auth_read_only');
    await recordLoginEvent({
      eventType: 'login_success',
      status: 'success',
      device,
      accessLevel: 'full',
    });
    return { success: true, isReadOnly: false };
  }

  await recordLoginEvent({
    eventType: 'login_failure',
    status: 'failure',
    device,
    failureReason: 'Invalid PIN',
  });

  return { success: false, error: 'รหัส PIN ไม่ถูกต้อง' };
}

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('bb_auth_pin_verified')?.value === 'true';
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

  cookieStore.delete('bb_auth_pin_verified');
  cookieStore.delete('bb_auth_read_only');
}
