import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

/**
 * Server-only audit writes (not a Server Action).
 * Used after master-PIN remote revoke so clients cannot forge logout rows
 * for arbitrary fingerprints via recordLoginEvent.
 */
export async function insertRemoteLogoutAudits(fingerprints: string[]): Promise<void> {
  const unique = [...new Set(fingerprints.filter(Boolean))];
  if (unique.length === 0) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('[insertRemoteLogoutAudits] Missing Supabase admin env');
    return;
  }

  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    headerStore.get('cf-connecting-ip') ??
    null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const occurredAt = new Date().toISOString();

  const rows = unique.map((session_fingerprint) => ({
    event_type: 'logout' as const,
    occurred_at: occurredAt,
    ip_address: ip,
    access_level: 'full' as const,
    status: 'success' as const,
    failure_reason: null,
    user_agent: 'remote-revoke',
    device_type: 'unknown' as const,
    device_vendor: null,
    device_model: null,
    os_name: null,
    os_version: null,
    browser_name: null,
    browser_version: null,
    session_fingerprint,
    metadata: { source: 'forced_remote_revoke' },
  }));

  const { error } = await supabase.from('login_history').insert(rows);
  if (error) {
    console.error('Supabase Error:', error.message, error.details);
  }
}
