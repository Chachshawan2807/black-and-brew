import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { startOfWeek, addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import LiveShiftList from './LiveShiftList';
import MonthlyRoster from './MonthlyRoster';
import { getDashboardShiftQueryPlan, splitDashboardShiftsByRange } from '../dashboard-data';
import { DashboardSectionSkeleton } from './DashboardSectionSkeleton';

async function resolveDashboardDates(searchParams: Promise<{ start?: string; end?: string }>) {
  const [{ start: startParam, end: endParam }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);

  const savedStart = cookieStore.get('dashboard_start_date')?.value;
  const savedEnd = cookieStore.get('dashboard_end_date')?.value;
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);

  const startDate = startParam || savedStart || format(monday, 'yyyy-MM-dd');
  const endDate = endParam || savedEnd || format(sunday, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  return { startDate, endDate, monthStart, monthEnd };
}

async function DashboardWeeklySection({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { startDate, endDate, monthStart, monthEnd } = await resolveDashboardDates(searchParams);
  const shiftQueryPlan = getDashboardShiftQueryPlan({
    startDate,
    endDate,
    monthStart,
    monthEnd,
  });
  const supabaseAdmin = getSupabaseAdmin();

  const [profilesRes, holidaysRes, shiftsResult] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, dashboard_order, schedule_order')
      .order('dashboard_order', { ascending: true }),
    supabaseAdmin
      .from('holidays')
      .select('id, date, name')
      .gte('date', startDate)
      .lte('date', endDate),
    shiftQueryPlan.mode === 'combined'
      ? supabaseAdmin
          .from('shifts')
          .select('id, employee_id, start_time, end_time, status, metadata')
          .gte('start_time', shiftQueryPlan.startDate + 'T00:00:00')
          .lte('start_time', shiftQueryPlan.endDate + 'T23:59:59')
      : supabaseAdmin
          .from('shifts')
          .select('id, employee_id, start_time, end_time, status, metadata')
          .gte('start_time', shiftQueryPlan.weeklyStart + 'T00:00:00')
          .lte('start_time', shiftQueryPlan.weeklyEnd + 'T23:59:59'),
  ]);

  const shifts =
    shiftQueryPlan.mode === 'combined'
      ? splitDashboardShiftsByRange(shiftsResult.data || [], {
          startDate,
          endDate,
          monthStart,
          monthEnd,
        }).weeklyShifts
      : shiftsResult.data || [];

  return (
    <LiveShiftList
      initialProfiles={profilesRes.data || []}
      initialShifts={shifts}
      initialHolidays={holidaysRes.data || []}
      startDate={startDate}
      endDate={endDate}
    />
  );
}

async function DashboardMonthlySection({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { startDate, endDate, monthStart, monthEnd } = await resolveDashboardDates(searchParams);
  const shiftQueryPlan = getDashboardShiftQueryPlan({
    startDate,
    endDate,
    monthStart,
    monthEnd,
  });
  const supabaseAdmin = getSupabaseAdmin();

  const [profilesRes, shiftsResult] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, dashboard_order, schedule_order')
      .order('schedule_order', { ascending: true }),
    shiftQueryPlan.mode === 'combined'
      ? supabaseAdmin
          .from('shifts')
          .select('id, employee_id, start_time, end_time, status, metadata')
          .gte('start_time', shiftQueryPlan.startDate + 'T00:00:00')
          .lte('start_time', shiftQueryPlan.endDate + 'T23:59:59')
      : supabaseAdmin
          .from('shifts')
          .select('id, employee_id, start_time, end_time, status, metadata')
          .gte('start_time', shiftQueryPlan.monthlyStart + 'T00:00:00')
          .lte('start_time', shiftQueryPlan.monthlyEnd + 'T23:59:59'),
  ]);

  const rosterShifts =
    shiftQueryPlan.mode === 'combined'
      ? splitDashboardShiftsByRange(shiftsResult.data || [], {
          startDate,
          endDate,
          monthStart,
          monthEnd,
        }).monthlyShifts
      : shiftsResult.data || [];

  return (
    <MonthlyRoster
      initialProfiles={profilesRes.data || []}
      initialShifts={rosterShifts}
      initialStartDate={monthStart}
      initialEndDate={monthEnd}
    />
  );
}

export function DashboardWeeklyStream({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  return (
    <Suspense fallback={<DashboardSectionSkeleton label="Fetching live shifts..." />}>
      <DashboardWeeklySection searchParams={searchParams} />
    </Suspense>
  );
}

export function DashboardMonthlyStream({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  return (
    <Suspense fallback={<DashboardSectionSkeleton label="Loading monthly roster..." />}>
      <DashboardMonthlySection searchParams={searchParams} />
    </Suspense>
  );
}
