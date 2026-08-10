import { format, parseISO, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { createClient } from '@supabase/supabase-js';
import {
  fetchNextHoliday,
  fetchTodayShifts,
  type StaffShiftEntry,
} from '@/app/actions/daily-report-actions';
import { TABLE_MAX_LIMITS } from '@/lib/ai-data-gateway';
import type {
  OperationalSnapshot,
  PendingBeanOrderInsight,
  WeeklyDaySchedule,
} from '@/lib/proactive-insights/types';
import { getWeekDateIsos } from '@/lib/proactive-insights/week-schedule';

export type ShiftSnapshotBlock = {
  activeStaff: StaffShiftEntry[];
  otherDutyStaff: StaffShiftEntry[];
  offStaff: StaffShiftEntry[];
  headcount: number;
};

export type OperationalSnapshotDeps = {
  fetchShifts: (date: Date) => Promise<ShiftSnapshotBlock>;
  fetchWeekSchedule: (anchorDate: Date) => Promise<WeeklyDaySchedule[]>;
  fetchPendingBeanOrders: () => Promise<PendingBeanOrderInsight[]>;
  fetchYesterdaySales: (yesterdayIso: string) => Promise<number>;
  fetchNextHoliday: (
    date: Date,
  ) => Promise<{ name: string; daysRemaining: number } | null>;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function countLeaveStaff(offStaff: StaffShiftEntry[]): number {
  return offStaff.filter((entry) => entry.shiftText.trim() === 'ลา').length;
}

export function dateIsoToDisplay(dateIso: string): string {
  const parsed = parseISO(dateIso);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return format(parsed, 'dd-MM-yyyy');
}

async function defaultFetchPendingBeanOrders(): Promise<PendingBeanOrderInsight[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data, error } = await admin
    .from('bean_orders')
    .select('payment_status, fulfillment_status, recipient_name, bean_customers(name)')
    .gte('created_at', since.toISOString())
    .is('cancelled_at', null)
    .limit(TABLE_MAX_LIMITS.bean_orders);

  if (error) {
    console.error('[proactive-insights] bean_orders:', error.message, error.details);
    return [];
  }

  const { getBeanOrderCustomerDisplayName } = await import('@/lib/bean-orders/customer-display');
  const pending: PendingBeanOrderInsight[] = [];

  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const payment = String(row.payment_status ?? '');
    const fulfillment = String(row.fulfillment_status ?? '');
    if (payment !== 'unpaid' && fulfillment !== 'pending') continue;

    const customer = row.bean_customers as { name?: string } | null;
    pending.push({
      customerName: getBeanOrderCustomerDisplayName({
        customerName: customer?.name ?? null,
        recipientName: String(row.recipient_name ?? ''),
      }),
      paymentStatus: payment,
      fulfillmentStatus: fulfillment,
    });
  }

  return pending;
}

async function defaultFetchYesterdaySales(yesterdayIso: string): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;

  const { data, error } = await admin
    .from('sales_records')
    .select('total_amount')
    .gte('sale_date', yesterdayIso)
    .lte('sale_date', yesterdayIso)
    .limit(TABLE_MAX_LIMITS.sales_records);

  if (error) {
    console.error('[proactive-insights] sales_records:', error.message, error.details);
    return 0;
  }

  let total = 0;
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    total += toNumber(row.total_amount);
  }
  return total;
}

async function defaultFetchNextHoliday(
  date: Date,
): Promise<{ name: string; daysRemaining: number } | null> {
  const holiday = await fetchNextHoliday(date);
  if (holiday && holiday.ok === true && typeof holiday.daysRemaining === 'number') {
    return { name: holiday.name, daysRemaining: holiday.daysRemaining };
  }
  return null;
}

async function defaultFetchWeekSchedule(anchorDate: Date): Promise<WeeklyDaySchedule[]> {
  const anchorIso = format(anchorDate, 'yyyy-MM-dd');
  const weekIsos = getWeekDateIsos(anchorIso);

  const results = await Promise.all(
    weekIsos.map(async (dateIso, dayIndex) => {
      const shifts = await fetchTodayShifts(parseISO(dateIso));
      return {
        dateIso,
        dayIndex,
        headcount: shifts.headcount,
        leaveCount: countLeaveStaff(shifts.offStaff),
        leaveStaff: shifts.offStaff
          .filter((entry) => entry.shiftText.trim() === 'ลา')
          .map((entry) => ({ name: entry.name })),
      };
    }),
  );

  return results;
}

export const defaultOperationalSnapshotDeps: OperationalSnapshotDeps = {
  fetchShifts: fetchTodayShifts,
  fetchWeekSchedule: defaultFetchWeekSchedule,
  fetchPendingBeanOrders: defaultFetchPendingBeanOrders,
  fetchYesterdaySales: defaultFetchYesterdaySales,
  fetchNextHoliday: defaultFetchNextHoliday,
};

async function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error('[proactive-insights] snapshot dep failed:', error);
    return fallback;
  }
}

function emptyWeekSchedule(anchorDateIso: string): WeeklyDaySchedule[] {
  return getWeekDateIsos(anchorDateIso).map((dateIso, dayIndex) => ({
    dateIso,
    dayIndex,
    headcount: 0,
    leaveCount: 0,
    leaveStaff: [],
  }));
}

export async function compileOperationalSnapshot(
  opts: { dateIso: string; locale?: string },
  deps: OperationalSnapshotDeps = defaultOperationalSnapshotDeps,
): Promise<OperationalSnapshot> {
  const locale = opts.locale ?? 'th';
  const date = parseISO(opts.dateIso);
  const yesterdayIso = format(subDays(date, 1), 'yyyy-MM-dd');

  const [shifts, weeklyDays, pendingBeanOrders, yesterdaySalesTotal, upcomingHoliday] =
    await Promise.all([
      settle(deps.fetchShifts(date), {
        activeStaff: [],
        otherDutyStaff: [],
        offStaff: [],
        headcount: 0,
      }),
      settle(deps.fetchWeekSchedule(date), emptyWeekSchedule(opts.dateIso)),
      settle(deps.fetchPendingBeanOrders(), []),
      settle(deps.fetchYesterdaySales(yesterdayIso), 0),
      settle(deps.fetchNextHoliday(date), null),
    ]);

  return {
    dateIso: opts.dateIso,
    dateDisplay: dateIsoToDisplay(opts.dateIso),
    locale,
    headcount: shifts.headcount,
    leaveCount: countLeaveStaff(shifts.offStaff),
    offCount: shifts.offStaff.length,
    weeklyDays,
    pendingBeanOrders,
    yesterdaySalesTotal,
    upcomingHoliday,
  };
}

/** Resolve Bangkok calendar date for the daily 07:00 ICT insight cron. */
export function resolveInsightTargetDateIso(now: Date = new Date()): string {
  const bkk = toZonedTime(now, 'Asia/Bangkok');
  return format(bkk, 'yyyy-MM-dd');
}
