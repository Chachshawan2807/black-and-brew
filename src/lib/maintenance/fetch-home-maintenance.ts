import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAccessToken } from '@/lib/supabase-session';
import { supabase } from '@/lib/supabase';
import { computeMaintenanceDueWithinMonth } from '@/lib/maintenance/filter-due-within-month';
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

const SERVICE_RECORDS_HOME_SELECT =
  'id, equipment, work_details, start_date, completion_date, recommended_frequency, task_type';

/**
 * Load home "due within 1 month" tasks using any Supabase client.
 * RSC home page must pass getSupabaseAdmin() — never a browser JWT
 * (module-cached anon tokens expire → "JWT expired" on the server).
 */
export async function queryHomeMaintenanceTasks(
  supabase: Pick<SupabaseClient, 'from'>,
  currentIsoDate: string,
) {
  const { data, error } = await supabase
    .from('service_records')
    .select(SERVICE_RECORDS_HOME_SELECT)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Supabase Error:', error.message, error.details);
    // Throw a real Error so RSC catch/logging never becomes "[object Object]"
    throw new Error(error.message || 'Failed to fetch service_records');
  }

  return computeMaintenanceDueWithinMonth(
    (data || []) as MaintenanceServiceRecord[],
    currentIsoDate,
  );
}

/** Client-side refresh path (realtime hook) — uses the browser session JWT. */
export async function fetchHomeMaintenanceTasks(currentIsoDate: string) {
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) {
    throw new Error('Missing authenticated Supabase session');
  }

  // Reuse the browser singleton — a second createClient() duplicates GoTrueClient storage.
  return queryHomeMaintenanceTasks(supabase, currentIsoDate);
}
