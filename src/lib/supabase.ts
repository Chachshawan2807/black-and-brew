import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAuthLock } from './supabase-auth-lock';

export type { Database, Tables, TablesInsert, TablesUpdate } from './database.types';

/**
 * BLACK-AND-BREW Supabase Client
 * 
 * Rationale:
 * - Singleton pattern ensures a single connection pool on the client.
 * - Real-time enabled for "Dynamic Islands" strategy (Shift Timeline updates).
 * - R0 Mitigation: Database uses TIMESTAMPTZ (UTC); client handles ISO strings.
 * - Strict Validation: Throws error if environment variables are missing.
 */

const supabaseConfig = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      '❌ [Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }
  return { url, anonKey };
})();

const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.anonKey;

// R0 (Critical) & R2 Mitigation: Initialize Singleton
const globalForSupabase = globalThis as typeof globalThis & {
  __bb_supabase__?: SupabaseClient;
};

function createBrowserSupabaseClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      lock: createSupabaseAuthLock,
    },
    realtime: {
      params: {
        eventsPerSecond: 2, // Optimized for mobile-first latency
      },
    },
    db: {
      schema: 'public',
    },
  });
}

export const supabase =
  globalForSupabase.__bb_supabase__ ?? createBrowserSupabaseClient();

if (typeof window !== 'undefined') {
  globalForSupabase.__bb_supabase__ = supabase;
}

// Implementation aligns with R0 (Timezone Drift) strategy:
// All timestamp data from this client is handled as UTC ISO strings.
// Regional formatting (GMT+7) is delegated to Client-side Intl/date-fns-tz.
