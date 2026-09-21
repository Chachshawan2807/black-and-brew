import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import type { Shift } from '@/types';

export type ClientShiftRow = Pick<
  Shift,
  'id' | 'employee_id' | 'start_time' | 'end_time' | 'status' | 'metadata'
>;

/** Shared with ScheduleClient week refresh and home member panel day refresh. */
export const CLIENT_SHIFT_COLUMNS =
  'id, employee_id, start_time, end_time, status, metadata' as const;

export function normalizeClientShiftRow<T extends ClientShiftRow>(shift: T): T {
  const datePart = shift.start_time.split('T')[0];
  return {
    ...shift,
    start_time: `${datePart}T00:00:00`,
    end_time: `${datePart}T23:59:59`,
  };
}

function queryWeekShiftsFromClient(weekStart: string, weekEnd: string) {
  return supabase
    .from('shifts')
    .select(CLIENT_SHIFT_COLUMNS)
    .gte('start_time', `${weekStart}T00:00:00`)
    .lte('start_time', `${weekEnd}T23:59:59`)
    .not('status', 'is', null)
    .not('status', 'eq', '')
    .not('metadata->>location', 'is', null)
    .not('metadata->>location', 'eq', '');
}

function queryWeekHolidaysFromClient(weekStart: string, weekEnd: string) {
  return supabase
    .from('holidays')
    .select('id, date, name')
    .gte('date', weekStart)
    .lte('date', weekEnd);
}

export async function fetchWeekShiftsFromClient(
  weekStart: string,
  weekEnd: string,
): Promise<ClientShiftRow[] | null> {
  const sessionOk = await ensureSupabaseSession();
  if (!sessionOk) {
    return null;
  }

  const { data, error } = await queryWeekShiftsFromClient(weekStart, weekEnd);

  if (error) {
    throw error;
  }

  return (data ?? []).map((shift) => normalizeClientShiftRow(shift as ClientShiftRow));
}

export type ClientHolidayRow = {
  id: string;
  date: string;
  name: string;
};

export async function fetchScheduleWeekGridFromClient(
  weekStart: string,
  weekEnd: string,
): Promise<{ shifts: ClientShiftRow[]; holidays: ClientHolidayRow[] } | null> {
  const sessionOk = await ensureSupabaseSession();
  if (!sessionOk) {
    return null;
  }

  const shiftsQuery = queryWeekShiftsFromClient(weekStart, weekEnd);
  const holidaysQuery = queryWeekHolidaysFromClient(weekStart, weekEnd);
  const [shiftsRes, holidaysRes] = await Promise.all([shiftsQuery, holidaysQuery]);

  if (shiftsRes.error) {
    throw shiftsRes.error;
  }
  if (holidaysRes.error) {
    throw holidaysRes.error;
  }

  return {
    shifts: (shiftsRes.data ?? []).map((shift) => normalizeClientShiftRow(shift as ClientShiftRow)),
    holidays: (holidaysRes.data ?? []) as ClientHolidayRow[],
  };
}

export async function fetchShiftsForDateIsoFromClient(dateIso: string): Promise<ClientShiftRow[] | null> {
  const bkkDate = toZonedTime(parseISO(`${dateIso}T12:00:00+07:00`), 'Asia/Bangkok');
  return fetchShiftsForBkkDayFromClient(bkkDate);
}

export async function fetchShiftsForBkkDayFromClient(bkkDate: Date): Promise<ClientShiftRow[] | null> {
  const sessionOk = await ensureSupabaseSession();
  if (!sessionOk) {
    return null;
  }

  const startUtc = fromZonedTime(startOfDay(bkkDate), 'Asia/Bangkok').toISOString();
  const endUtc = fromZonedTime(endOfDay(bkkDate), 'Asia/Bangkok').toISOString();

  const { data, error } = await supabase
    .from('shifts')
    .select(CLIENT_SHIFT_COLUMNS)
    .gte('start_time', startUtc)
    .lte('start_time', endUtc)
    .not('status', 'is', null)
    .not('status', 'eq', '')
    .not('metadata->>location', 'is', null)
    .not('metadata->>location', 'eq', '');

  if (error) {
    throw error;
  }

  return (data ?? []).map((shift) => normalizeClientShiftRow(shift as ClientShiftRow));
}
