'use server';

import { addDays, format, startOfWeek } from 'date-fns';
import { fetchCountAccuracyStats, fetchTodayInventoryCountStatus } from '@/app/actions/inventory-actions';
import { INVENTORY_COUNT_SELECT } from '@/lib/inventory-queries';
import { groupRegularHolidayRows } from '@/lib/regular-holidays';
import { requireReadAccess } from '@/lib/policies/server-gate';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { CountAccuracyStatsResult, TodayCountSessionStatus } from '@/app/actions/inventory-actions';
import type { Profile, Shift } from '@/types';

export type InventoryCountOverlayData = {
  items: Array<Record<string, unknown>>;
  initialAccuracyStats: CountAccuracyStatsResult | null;
  initialTodayStatus: TodayCountSessionStatus | null;
};

export type ScheduleOverlayData = {
  initialProfiles: Profile[];
  initialShifts: Shift[];
  initialHolidays: { id: string; date: string; name: string }[];
  initialRegularHolidays: ReturnType<typeof groupRegularHolidayRows>;
  initialDateStr: string;
};

export async function fetchInventoryCountOverlayData(): Promise<{
  success: boolean;
  data?: InventoryCountOverlayData;
  error?: string;
}> {
  const authError = await requireReadAccess();
  if (authError) return { success: false, error: authError };

  const [itemsResult, accuracyResult, todayStatusResult] = await Promise.all([
    getSupabaseAdmin()
      .from('inventory_items')
      .select(INVENTORY_COUNT_SELECT)
      .order('sort_order', { ascending: true }),
    fetchCountAccuracyStats(),
    fetchTodayInventoryCountStatus(),
  ]);

  if (itemsResult.error) {
    console.error('Supabase Error (Count Fetch):', itemsResult.error.message, itemsResult.error.details);
    return { success: false, error: itemsResult.error.message };
  }

  return {
    success: true,
    data: {
      items: itemsResult.data ?? [],
      initialAccuracyStats:
        accuracyResult.success && accuracyResult.data ? accuracyResult.data : null,
      initialTodayStatus:
        todayStatusResult.success && todayStatusResult.data ? todayStatusResult.data : null,
    },
  };
}

export async function fetchScheduleOverlayData(weekParam?: string): Promise<{
  success: boolean;
  data?: ScheduleOverlayData;
  error?: string;
}> {
  const authError = await requireReadAccess();
  if (authError) return { success: false, error: authError };

  const baseDate = weekParam ? new Date(weekParam) : new Date();
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  const mondayStr = format(monday, 'yyyy-MM-dd');
  const sundayStr = format(sunday, 'yyyy-MM-dd');

  const supabaseAdmin = getSupabaseAdmin();

  const [profilesRes, shiftsRes, regularHolidaysRes, holidaysRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, schedule_order')
      .order('schedule_order', { ascending: true }),
    supabaseAdmin
      .from('shifts')
      .select('id, employee_id, start_time, end_time, status, metadata')
      .gte('start_time', `${mondayStr}T00:00:00`)
      .lte('start_time', `${sundayStr}T23:59:59`)
      .not('status', 'is', null)
      .not('status', 'eq', '')
      .not('metadata->>location', 'is', null)
      .not('metadata->>location', 'eq', ''),
    supabaseAdmin.from('regular_holidays').select('id, profile_id, day_of_week'),
    supabaseAdmin
      .from('holidays')
      .select('id, date, name')
      .gte('date', mondayStr)
      .lte('date', sundayStr),
  ]);

  if (regularHolidaysRes.error) {
    console.error('Supabase Error:', regularHolidaysRes.error.message, regularHolidaysRes.error.details);
  }

  const normalizedShifts = (shiftsRes.data || []).map((shift) => {
    const datePart = shift.start_time.split('T')[0];
    return {
      ...shift,
      start_time: `${datePart}T00:00:00`,
      end_time: `${datePart}T23:59:59`,
    };
  }) as Shift[];

  return {
    success: true,
    data: {
      initialProfiles: (profilesRes.data ?? []) as Profile[],
      initialShifts: normalizedShifts,
      initialHolidays: holidaysRes.data ?? [],
      initialRegularHolidays: groupRegularHolidayRows(regularHolidaysRes.data),
      initialDateStr: mondayStr,
    },
  };
}
