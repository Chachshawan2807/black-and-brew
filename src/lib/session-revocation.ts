import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminClient() {
  return createClient(supabaseUrl, supabaseAdminKey);
}

export async function isSessionFingerprintRevoked(fingerprint: string): Promise<boolean> {
  if (!fingerprint) return false;
  try {
    const supabase = adminClient();
    const { data, error } = await supabase
      .from('revoked_sessions')
      .select('session_fingerprint')
      .eq('session_fingerprint', fingerprint)
      .maybeSingle();

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return true;
    }
    return Boolean(data);
  } catch (error) {
    console.error('[isSessionFingerprintRevoked] Exception:', error);
    return true;
  }
}

/**
 * Returns fingerprints present in revoked_sessions.
 * Fail-open (empty set) on query error — used for settings UI listing only.
 * Auth gates must keep using isSessionFingerprintRevoked (fail-closed).
 */
export async function getRevokedFingerprints(
  fingerprints: string[]
): Promise<Set<string>> {
  const unique = [...new Set(fingerprints.filter(Boolean))];
  if (unique.length === 0) return new Set();

  try {
    const supabase = adminClient();
    const { data, error } = await supabase
      .from('revoked_sessions')
      .select('session_fingerprint')
      .in('session_fingerprint', unique);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return new Set();
    }

    return new Set((data ?? []).map((row) => String(row.session_fingerprint)));
  } catch (error) {
    console.error('[getRevokedFingerprints] Exception:', error);
    return new Set();
  }
}

export async function revokeSessionFingerprints(
  fingerprints: string[],
  reason = 'forced_by_master'
): Promise<void> {
  const unique = [...new Set(fingerprints.filter(Boolean))];
  if (unique.length === 0) return;

  try {
    const supabase = adminClient();
    const rows = unique.map((session_fingerprint) => ({
      session_fingerprint,
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    }));

    const { error } = await supabase.from('revoked_sessions').upsert(rows, {
      onConflict: 'session_fingerprint',
    });

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }
  } catch (error) {
    console.error('[revokeSessionFingerprints] Exception:', error);
    throw error;
  }
}

export async function clearSessionRevocation(fingerprint: string): Promise<void> {
  if (!fingerprint) return;
  try {
    const supabase = adminClient();
    const { error } = await supabase
      .from('revoked_sessions')
      .delete()
      .eq('session_fingerprint', fingerprint);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
    }
  } catch (error) {
    console.error('[clearSessionRevocation] Exception:', error);
  }
}
