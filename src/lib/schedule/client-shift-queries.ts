import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';
import type { Shift } from '@/types';

export type ClientShiftRow = Pick<
  Shift,
  'id' | 'employee_id' | 'start_time' | 'end_time' | 'status' | 'metadata'
>;

export function normalizeClientShiftRow<T extends ClientShiftRow>(shift: T): T {
  const datePart = shift.start_time.split('T')[0];
  return {
    ...shift,
    start_time: `${datePart}T00:00:00`,
    end_time: `${datePart}T23:59:59`,
  };
}

export async function fetchWeekShiftsFromClient(
  weekStart: string,
  weekEnd: string,
): Promise<ClientShiftRow[] | null> {
  const sessionOk = await ensureSupabaseSession();
  if (!sessionOk) {
    return null;
  }

  const { data, error } = await supabase
    .from('shifts')
    .select('id, employee_id, start_time, end_time, status, metadata')
    .gte('start_time', `${weekStart}T00:00:00`)
    .lte('start_time', `${weekEnd}T23:59:59`)
    .not('status', 'is', null)
    .not('status', 'eq', '')
    .not('metadata->>location', 'is', null)
    .not('metadata->>location', 'eq', '');

  if (error) {
    throw error;
  }

  return (data ?? []).map((shift) => normalizeClientShiftRow(shift as ClientShiftRow));
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
    .select('id, employee_id, start_time, end_time, status, metadata')
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
