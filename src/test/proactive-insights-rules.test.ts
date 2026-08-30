import { describe, expect, test } from 'vitest';
import type {
  OperationalSnapshot,
  PendingBeanOrderInsight,
  WeeklyDaySchedule,
} from '@/lib/proactive-insights/types';
import {
  buildDailyInsightDigest,
  evaluateInsightRules,
} from '@/lib/proactive-insights/rules';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';

function makeWeekDays(
  headcounts: number[],
  leaveStaffByDay: string[][] = Array(7).fill([]),
): WeeklyDaySchedule[] {
  return headcounts.map((headcount, dayIndex) => {
    const staff = leaveStaffByDay[dayIndex] ?? [];
    return {
      dateIso: `2026-07-${20 + dayIndex}`,
      dayIndex,
      headcount,
      leaveCount: staff.length,
      leaveStaff: staff.map((name) => ({ name })),
      isPublicHoliday: false,
    };
  });
}

function sampleSnapshot(overrides: Partial<OperationalSnapshot> = {}): OperationalSnapshot {
  const weeklyDays =
    overrides.weeklyDays ?? makeWeekDays([5, 5, 5, 5, 5, 5, 5]);
  const todayIndex = weeklyDays.findIndex((d) => d.dateIso === '2026-07-24') ?? 4;
  const today = weeklyDays[todayIndex] ?? weeklyDays[4];

  return {
    dateIso: '2026-07-24',
    dateDisplay: '24-07-2026',
    locale: 'th',
    headcount: today?.headcount ?? 5,
    leaveCount: today?.leaveCount ?? 0,
    offCount: 2,
    weeklyDays,
    pendingBeanOrders: [],
    upcomingHoliday: null,
    ...overrides,
  };
}

describe('evaluateInsightRules', () => {
  test('understaffed_low_stock lists short weekday dates with headcount', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([3, 5, 4, 5, 3, 4, 5]),
      }),
    );
    const hit = insights.find((i) => i.ruleId === 'understaffed_low_stock');
    expect(hit).toBeDefined();
    expect(hit!.title).toBe('คนน้อย');
    expect(hit!.summary).toContain('จ. ที่ 20 (3 คน)');
    expect(hit!.summary).toContain('ศ. ที่ 24 (3 คน)');
  });

  test('understaffed_low_stock does not fire when all days are above limits', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([4, 4, 5, 5, 4, 5, 5]),
      }),
    );
    expect(insights.find((i) => i.ruleId === 'understaffed_low_stock')).toBeUndefined();
  });

  test('understaffed_low_stock fires on public holidays when headcount is at or below 4', () => {
    const weeklyDays = makeWeekDays([5, 5, 5, 5, 5, 5, 5]);
    weeklyDays[2] = { ...weeklyDays[2], headcount: 4, isPublicHoliday: true };

    const insights = evaluateInsightRules(sampleSnapshot({ weeklyDays }));
    const hit = insights.find((i) => i.ruleId === 'understaffed_low_stock');

    expect(hit).toBeDefined();
    expect(hit!.summary).toContain('พ. ที่ 22 (4 คน)');
  });

  test('leave_coverage_risk groups upcoming leave by date with names', () => {
    const leaveStaffByDay = Array(7).fill([]) as string[][];
    leaveStaffByDay[4] = ['เอ'];
    leaveStaffByDay[5] = ['บี'];

    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 5, 5, 5, 5, 5], leaveStaffByDay),
      }),
    );
    const hit = insights.find((i) => i.ruleId === 'leave_coverage_risk');
    expect(hit).toBeDefined();
    expect(hit!.summary).toBe('ศ. ที่ 24 (เอ), ส. ที่ 25 (บี)');
  });

  test('leave_coverage_risk groups multiple names on the same day', () => {
    const leaveStaffByDay = Array(7).fill([]) as string[][];
    leaveStaffByDay[4] = ['เอ', 'บี'];
    leaveStaffByDay[5] = ['ซี'];

    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 5, 5, 5, 5, 5], leaveStaffByDay),
      }),
    );
    const hit = insights.find((i) => i.ruleId === 'leave_coverage_risk');
    expect(hit).toBeDefined();
    expect(hit!.summary).toBe('ศ. ที่ 24 (เอ, บี), ส. ที่ 25 (ซี)');
  });

  test('leave_coverage_risk excludes leave on past dates', () => {
    const leaveStaffByDay = Array(7).fill([]) as string[][];
    leaveStaffByDay[0] = ['เอ'];
    leaveStaffByDay[1] = ['บี'];
    leaveStaffByDay[5] = ['ซี'];

    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 5, 5, 5, 5, 5], leaveStaffByDay),
      }),
    );
    const hit = insights.find((i) => i.ruleId === 'leave_coverage_risk');
    expect(hit).toBeUndefined();
    expect(INSIGHT_THRESHOLDS.leaveCoverageMinLeave).toBe(2);
  });

  test('leave_coverage_risk includes leave on today and future dates only', () => {
    const leaveStaffByDay = Array(7).fill([]) as string[][];
    leaveStaffByDay[0] = ['เอ'];
    leaveStaffByDay[4] = ['บี'];
    leaveStaffByDay[5] = ['ซี'];

    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 5, 5, 5, 5, 5], leaveStaffByDay),
      }),
    );
    const hit = insights.find((i) => i.ruleId === 'leave_coverage_risk');
    expect(hit).toBeDefined();
    expect(hit!.summary).toBe('ศ. ที่ 24 (บี), ส. ที่ 25 (ซี)');
    expect(hit!.summary).not.toContain('เอ');
  });

  test('leave_coverage_risk does not fire below weekly leave threshold', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 5, 5, 5, 5, 5], [['เอ']]),
      }),
    );
    expect(insights.find((i) => i.ruleId === 'leave_coverage_risk')).toBeUndefined();
    expect(INSIGHT_THRESHOLDS.leaveCoverageMinLeave).toBe(2);
  });

  test('bean_orders_inventory_gap summarizes pending statuses on one line', () => {
    const pending: PendingBeanOrderInsight[] = [
      { customerName: 'คุณเอ', paymentStatus: 'unpaid', fulfillmentStatus: 'pending' },
      { customerName: 'ทัพพ์', paymentStatus: 'paid', fulfillmentStatus: 'pending' },
      { customerName: 'ทศกัณฐ์', paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
      { customerName: 'มุก', paymentStatus: 'unpaid', fulfillmentStatus: 'shipped' },
      {
        customerName: 'คุณลี',
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: null,
      },
    ];
    const insights = evaluateInsightRules(sampleSnapshot({ pendingBeanOrders: pending }));
    const hit = insights.find((i) => i.ruleId === 'bean_orders_inventory_gap');
    expect(hit).toBeDefined();
    expect(hit!.summary).toBe('ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 2 รายการ');
    expect(hit!.summary).not.toContain('คุณเอ');
  });

  test('bean_orders_inventory_gap does not fire when no pending orders', () => {
    const insights = evaluateInsightRules(sampleSnapshot({ pendingBeanOrders: [] }));
    expect(insights.find((i) => i.ruleId === 'bean_orders_inventory_gap')).toBeUndefined();
  });

  test('buildDailyInsightDigest merges matched rules into one notification', () => {
    const leaveStaffByDay = Array(7).fill([]) as string[][];
    leaveStaffByDay[4] = ['เอ'];
    leaveStaffByDay[5] = ['บี'];

    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([2, 5, 5, 5, 5, 5, 5], leaveStaffByDay),
        pendingBeanOrders: [
          { customerName: 'คุณซี', paymentStatus: 'unpaid', fulfillmentStatus: 'pending' },
        ],
      }),
    );
    const digest = buildDailyInsightDigest(insights);
    expect(digest).not.toBeNull();
    expect(digest!.ruleId).toBe('daily_digest');
    expect(digest!.title).toBe('การแจ้งเตือนที่ต้องตรวจสอบ');
    expect(digest!.summary).toContain('คนน้อย:');
    expect(digest!.summary).toContain('ลาหลายคน:');
    expect(digest!.summary).toContain('ออเดอร์เมล็ดค้าง:');
    expect(digest!.summary).toContain('ค้างชำระเงิน 1 รายการ');
    expect(digest!.summary).not.toContain('【');
  });

  test('buildDailyInsightDigest returns null when no rules match', () => {
    expect(buildDailyInsightDigest([])).toBeNull();
  });
});
