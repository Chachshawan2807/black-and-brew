import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { startOfWeek, addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import LiveShiftList from './LiveShiftList';
import MonthlyRoster from './MonthlyRoster';
import { getDashboardShiftQueryPlan, splitDashboardShiftsByRange } from '../dashboard-data';
import { DashboardSectionSkeleton } from './DashboardSectionSkeleton';
import {
  DASHBOARD_ROSTER_END_COOKIE,
  DASHBOARD_ROSTER_START_COOKIE,
  DASHBOARD_WEEKLY_END_COOKIE,
  DASHBOARD_WEEKLY_START_COOKIE,
  resolveDashboardDateRange,
} from '@/lib/dashboard-date-range';

async function resolveDashboardDates(searchParams: Promise<{ start?: string; end?: string }>) {
  const [{ start: startParam, end: endParam }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const weeklyRange = resolveDashboardDateRange({
    urlStart: startParam,
    urlEnd: endParam,
    cookieStart: cookieStore.get(DASHBOARD_WEEKLY_START_COOKIE)?.value,
    cookieEnd: cookieStore.get(DASHBOARD_WEEKLY_END_COOKIE)?.value,
    fallbackStart: format(monday, 'yyyy-MM-dd'),
    fallbackEnd: format(sunday, 'yyyy-MM-dd'),
  });

  const rosterRange = resolveDashboardDateRange({
    cookieStart: cookieStore.get(DASHBOARD_ROSTER_START_COOKIE)?.value,
    cookieEnd: cookieStore.get(DASHBOARD_ROSTER_END_COOKIE)?.value,
    fallbackStart: monthStart,
    fallbackEnd: monthEnd,
  });

  return {
    startDate: weeklyRange.start,
    endDate: weeklyRange.end,
    rosterStartDate: rosterRange.start,
    rosterEndDate: rosterRange.end,
  };
}

async function DashboardWeeklySection({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { startDate, endDate, rosterStartDate, rosterEndDate } =
    await resolveDashboardDates(searchParams);
  const shiftQueryPlan = getDashboardShiftQueryPlan({
    startDate,
    endDate,
    rosterStart: rosterStartDate,
    rosterEnd: rosterEndDate,
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
          rosterStart: rosterStartDate,
          rosterEnd: rosterEndDate,
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
  const { startDate, endDate, rosterStartDate, rosterEndDate } =
    await resolveDashboardDates(searchParams);
  const shiftQueryPlan = getDashboardShiftQueryPlan({
    startDate,
    endDate,
    rosterStart: rosterStartDate,
    rosterEnd: rosterEndDate,
  });
  const supabaseAdmin = getSupabaseAdmin();

  const [profilesRes, shiftsResult, holidaysRes] = await Promise.all([
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
          .gte('start_time', shiftQueryPlan.rosterStart + 'T00:00:00')
          .lte('start_time', shiftQueryPlan.rosterEnd + 'T23:59:59'),
    supabaseAdmin
      .from('holidays')
      .select('id, date, name')
      .gte('date', rosterStartDate)
      .lte('date', rosterEndDate),
  ]);

  const rosterShifts =
    shiftQueryPlan.mode === 'combined'
      ? splitDashboardShiftsByRange(shiftsResult.data || [], {
          startDate,
          endDate,
          rosterStart: rosterStartDate,
          rosterEnd: rosterEndDate,
        }).rosterShifts
      : shiftsResult.data || [];

  return (
    <MonthlyRoster
      initialProfiles={profilesRes.data || []}
      initialShifts={rosterShifts}
      initialHolidays={holidaysRes.data || []}
      initialStartDate={rosterStartDate}
      initialEndDate={rosterEndDate}
    />
  );
}

export function DashboardWeeklyStream({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  return (
    <Suspense fallback={<DashboardSectionSkeleton label="กำลังโหลดกะงานล่าสุด..." />}>
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
    <Suspense fallback={<DashboardSectionSkeleton label="กำลังโหลดตารางเวรรายเดือน..." />}>
      <DashboardMonthlySection searchParams={searchParams} />
    </Suspense>
  );
}
