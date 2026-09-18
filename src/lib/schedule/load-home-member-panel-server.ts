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
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import type { HomeShiftProfile } from '@/lib/schedule/home-shift-status';

export type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';

export async function fetchHomeMemberPanelFromServer(
  dateIso: string,
): Promise<HomeMemberPanelSnapshot> {
  const supabaseAdmin = getSupabaseAdmin();
  const bkkDate = toZonedTime(parseISO(`${dateIso}T12:00:00+07:00`), 'Asia/Bangkok');
  const startUtc = fromZonedTime(startOfDay(bkkDate), 'Asia/Bangkok').toISOString();
  const endUtc = fromZonedTime(endOfDay(bkkDate), 'Asia/Bangkok').toISOString();

  const [profilesRes, shiftsRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, schedule_order')
      .order('schedule_order', { ascending: true }),
    supabaseAdmin
      .from('shifts')
      .select(CLIENT_SHIFT_COLUMNS)
      .gte('start_time', startUtc)
      .lte('start_time', endUtc)
      .not('status', 'is', null)
      .not('status', 'eq', '')
      .not('metadata->>location', 'is', null)
      .not('metadata->>location', 'eq', ''),
  ]);

  if (profilesRes.error) {
    console.error(
      'Supabase Error (home member panel profiles):',
      profilesRes.error.message,
      profilesRes.error.details,
    );
    throw profilesRes.error;
  }

  if (shiftsRes.error) {
    console.error(
      'Supabase Error (home member panel shifts):',
      shiftsRes.error.message,
      shiftsRes.error.details,
    );
    throw shiftsRes.error;
  }

  const profiles = (profilesRes.data ?? []) as HomeShiftProfile[];
  const shifts = (shiftsRes.data ?? []).map((row) =>
    normalizeClientShiftRow(row as ClientShiftRow),
  );

  return {
    dateIso,
    profiles,
    shifts,
    leaveRows: buildHomeLeaveRows(profiles, shifts, dateIso),
    dutySummary: buildHomeDutySummary(profiles, shifts, dateIso),
  };
}
