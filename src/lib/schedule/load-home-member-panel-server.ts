import 'server-only';

import { endOfDay, parseISO, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  CLIENT_SHIFT_COLUMNS,
  normalizeClientShiftRow,
  type ClientShiftRow,
} from '@/lib/schedule/client-shift-queries';
import {
  buildHomeDutySummary,
  buildHomeLeaveRows,
} from '@/lib/schedule/home-day-roster';
import { addCalendarDaysIsoBkk } from '@/lib/schedule/bkk-calendar-date';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import type { HomeShiftProfile } from '@/lib/schedule/home-shift-status';

export type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';

async function fetchShiftsForDateIsoAdmin(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  targetDateIso: string,
) {
  const bkkDate = toZonedTime(parseISO(`${targetDateIso}T12:00:00+07:00`), 'Asia/Bangkok');
  const startUtc = fromZonedTime(startOfDay(bkkDate), 'Asia/Bangkok').toISOString();
  const endUtc = fromZonedTime(endOfDay(bkkDate), 'Asia/Bangkok').toISOString();

  const shiftsRes = await supabaseAdmin
    .from('shifts')
    .select(CLIENT_SHIFT_COLUMNS)
    .gte('start_time', startUtc)
    .lte('start_time', endUtc)
    .not('status', 'is', null)
    .not('status', 'eq', '')
    .not('metadata->>location', 'is', null)
    .not('metadata->>location', 'eq', '');

  if (shiftsRes.error) {
    console.error(
      'Supabase Error (home member panel shifts):',
      shiftsRes.error.message,
      shiftsRes.error.details,
    );
    throw shiftsRes.error;
  }

  return (shiftsRes.data ?? []).map((row) => normalizeClientShiftRow(row as ClientShiftRow));
}

export async function fetchHomeMemberPanelFromServer(
  dateIso: string,
): Promise<HomeMemberPanelSnapshot> {
  const supabaseAdmin = getSupabaseAdmin();
  const tomorrowDateIso = addCalendarDaysIsoBkk(dateIso, 1);

  const [profilesRes, shifts, tomorrowShifts] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, schedule_order')
      .order('schedule_order', { ascending: true }),
    fetchShiftsForDateIsoAdmin(supabaseAdmin, dateIso),
    fetchShiftsForDateIsoAdmin(supabaseAdmin, tomorrowDateIso),
  ]);

  if (profilesRes.error) {
    console.error(
      'Supabase Error (home member panel profiles):',
      profilesRes.error.message,
      profilesRes.error.details,
    );
    throw profilesRes.error;
  }

  const profiles = (profilesRes.data ?? []) as HomeShiftProfile[];

  return {
    dateIso,
    profiles,
    shifts,
    tomorrowDateIso,
    tomorrowShifts,
    leaveRows: buildHomeLeaveRows(profiles, shifts, dateIso),
    dutySummary: buildHomeDutySummary(profiles, shifts, dateIso),
  };
}
