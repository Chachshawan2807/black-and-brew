import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getBangkokCalendarDayQueryBounds } from '@/lib/date-utils';
import {
  CLIENT_SHIFT_COLUMNS,
  normalizeClientShiftRow,
  type ClientShiftRow,
} from '@/lib/schedule/client-shift-queries';
import { splitHomeMemberPanelShifts } from '@/lib/schedule/home-member-panel';
import {
  buildHomeDutySummary,
  buildHomeLeaveRows,
} from '@/lib/schedule/home-day-roster';
import { addCalendarDaysIsoBkk } from '@/lib/schedule/bkk-calendar-date';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import type { HomeShiftProfile } from '@/lib/schedule/home-shift-status';

export type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';

async function fetchShiftsForTwoDatesAdmin(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  dateIso: string,
  tomorrowDateIso: string,
) {
  const firstDay = getBangkokCalendarDayQueryBounds(dateIso);
  const secondDay = getBangkokCalendarDayQueryBounds(tomorrowDateIso);

  const shiftsRes = await supabaseAdmin
    .from('shifts')
    .select(CLIENT_SHIFT_COLUMNS)
    .gte('start_time', firstDay.startInclusive)
    .lte('start_time', secondDay.endInclusive)
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

  const splitRows = splitHomeMemberPanelShifts(
    (shiftsRes.data ?? []) as ClientShiftRow[],
    dateIso,
    tomorrowDateIso,
  );
  return {
    shifts: splitRows.shifts.map(normalizeClientShiftRow),
    tomorrowShifts: splitRows.tomorrowShifts.map(normalizeClientShiftRow),
  };
}

export async function fetchHomeMemberPanelFromServer(
  dateIso: string,
): Promise<HomeMemberPanelSnapshot> {
  const supabaseAdmin = getSupabaseAdmin();
  const tomorrowDateIso = addCalendarDaysIsoBkk(dateIso, 1);

  const [profilesRes, shiftRange] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, schedule_order')
      .order('schedule_order', { ascending: true }),
    fetchShiftsForTwoDatesAdmin(supabaseAdmin, dateIso, tomorrowDateIso),
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
    shifts: shiftRange.shifts,
    tomorrowDateIso,
    tomorrowShifts: shiftRange.tomorrowShifts,
    leaveRows: buildHomeLeaveRows(profiles, shiftRange.shifts, dateIso),
    dutySummary: buildHomeDutySummary(profiles, shiftRange.shifts, dateIso),
  };
}
