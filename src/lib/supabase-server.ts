import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '@/lib/security/server-auth';

let adminClient: SupabaseClient | null = null;

/**
 * Singleton Supabase admin client for server components and actions.
 * Reuses one connection config instead of creating a new client per page.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    }

    adminClient = createClient(supabaseUrl, requireServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
      },
    });
  }

  return adminClient;
}
