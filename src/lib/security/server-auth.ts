import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SESSION_FP_COOKIE } from '@/lib/auth-constants';
import { isSessionFingerprintRevoked } from '@/lib/session-revocation';

export type ServerAuthResult =
  | { ok: true; userId?: string; readOnly: boolean }
  | { ok: false; error: string };

const UNAUTHORIZED_MSG = 'Unauthorized: Session missing or invalid';

function clearPinAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>): void {
  cookieStore.delete('bb_auth_pin_verified');
  cookieStore.delete('bb_auth_read_only');
  cookieStore.delete(SESSION_FP_COOKIE);
}

/**
 * ADR: SEC-AUTH-001 — Server-side session gate (PIN or Supabase getUser).
 * Never trust client-only auth; always verify on the server.
 *
 * PIN sessions also check `revoked_sessions` via device fingerprint so
 * force-revoke takes effect immediately on the server, not only after
 * client polling. See DEC-069.
 *
 * Returns `readOnly` so privileged endpoints (e.g. the RLS-bypassing AI chat)
 * can deny read-only PIN sessions.
 */
export async function ensureServerSession(): Promise<ServerAuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';
  const readOnly = cookieStore.get('bb_auth_read_only')?.value === 'true';

  if (pinVerified) {
    const fingerprint = cookieStore.get(SESSION_FP_COOKIE)?.value;
    if (fingerprint && (await isSessionFingerprintRevoked(fingerprint))) {
      clearPinAuthCookies(cookieStore);
      return { ok: false, error: UNAUTHORIZED_MSG };
    }
    return { ok: true, readOnly };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, error: 'System configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (!user || authError) {
    return { ok: false, error: UNAUTHORIZED_MSG };
  }

  return { ok: true, userId: user.id, readOnly };
}

/** Require SUPABASE_SERVICE_ROLE_KEY — never fall back to anon key. */
export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return key;
}
