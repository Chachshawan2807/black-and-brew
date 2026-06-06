import { createClient } from '@supabase/supabase-js';
import {
  formatDailyShifts,
  type FormattedDailyShifts,
} from '@/lib/schedule/format-daily-shifts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase Service Role configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function fetchDailyShiftsByDate(date: string): Promise<FormattedDailyShifts> {
  const adminClient = getAdminClient();

  const [profilesRes, shiftsRes] = await Promise.all([
    adminClient
      .from('profiles')
      .select('id, full_name, schedule_order')
      .order('schedule_order', { ascending: true }),
    adminClient
      .from('shifts')
      .select('employee_id, status, metadata')
      .gte('start_time', `${date}T00:00:00`)
      .lte('start_time', `${date}T23:59:59`),
  ]);

  if (profilesRes.error) {
    console.error('Supabase Error:', profilesRes.error.message, profilesRes.error.details);
    throw profilesRes.error;
  }

  if (shiftsRes.error) {
    console.error('Supabase Error:', shiftsRes.error.message, shiftsRes.error.details);
    throw shiftsRes.error;
  }

  return formatDailyShifts(profilesRes.data ?? [], shiftsRes.data ?? []);
}
