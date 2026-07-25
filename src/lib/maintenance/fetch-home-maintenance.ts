import { createClient } from '@supabase/supabase-js';
import { getSupabaseAccessToken } from '@/lib/supabase-session';
import { computeMaintenanceDueWithinMonth } from '@/lib/maintenance/filter-due-within-month';
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

function getSupabaseUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return supabaseUrl;
}

function getSupabaseAnonKey(): string {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return supabaseAnonKey;
}

function createAuthenticatedClient(accessToken: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    },
    db: {
      schema: 'public',
    },
  });
}

export async function fetchHomeMaintenanceTasks(currentIsoDate: string) {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) {
    throw new Error('Missing authenticated Supabase session');
  }

  const supabase = createAuthenticatedClient(accessToken);
  const { data, error } = await supabase
    .from('service_records')
    .select('id, equipment, work_details, start_date, completion_date, recommended_frequency, status, task_type')
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  return computeMaintenanceDueWithinMonth((data || []) as MaintenanceServiceRecord[], currentIsoDate);
}
