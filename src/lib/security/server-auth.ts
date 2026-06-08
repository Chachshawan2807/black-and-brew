import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export type ServerAuthResult =
  | { ok: true; userId?: string; readOnly: boolean }
  | { ok: false; error: string };

/**
 * ADR: SEC-AUTH-001 — Server-side session gate (PIN or Supabase getUser).
 * Never trust client-only auth; always verify on the server.
 *
 * Returns `readOnly` so privileged endpoints (e.g. the RLS-bypassing AI chat)
 * can deny read-only PIN sessions. See DEC-069.
 */
export async function ensureServerSession(): Promise<ServerAuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';
  const readOnly = cookieStore.get('bb_auth_read_only')?.value === 'true';

  if (pinVerified) {
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
    return { ok: false, error: 'Unauthorized: Session missing or invalid' };
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
