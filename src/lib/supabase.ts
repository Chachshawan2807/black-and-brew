import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// R1 Validation: Ensure keys exist before initialization
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ [Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

// R0 (Critical) & R2 Mitigation: Initialize Singleton
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 2, // Optimized for mobile-first latency
    },
  },
  db: {
    schema: 'public',
  },
});

// Implementation aligns with R0 (Timezone Drift) strategy:
// All timestamp data from this client is handled as UTC ISO strings.
// Regional formatting (GMT+7) is delegated to Client-side Intl/date-fns-tz.
