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
    yesterdaySalesTotal: 0,
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
    expect(hit!.summary).toContain('จ. 20 3 คน');
    expect(hit!.summary).toContain('ศ. 24 3 คน');
  });

  test('understaffed_low_stock does not fire when all days are above limits', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([4, 4, 5, 5, 4, 5, 5]),
      }),
    );
    expect(insights.find((i) => i.ruleId === 'understaffed_low_stock')).toBeUndefined();
  });

  test('leave_coverage_risk lists each leave with short weekday date', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 5, 5, 5, 5, 5], [['เอ'], ['บี']]),
      }),
    );
    const hit = insights.find((i) => i.ruleId === 'leave_coverage_risk');
    expect(hit).toBeDefined();
    expect(hit!.summary).toContain('เอ (จ. 20)');
    expect(hit!.summary).toContain('บี (อ. 21)');
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

  test('bean_orders_inventory_gap lists customer names and pending status', () => {
    const pending: PendingBeanOrderInsight[] = [
      { customerName: 'คุณเอ', statusLabel: 'ค้างชำระเงิน' },
      { customerName: 'ทัพพ์', statusLabel: 'ค้างจัดส่ง' },
    ];
    const insights = evaluateInsightRules(sampleSnapshot({ pendingBeanOrders: pending }));
    const hit = insights.find((i) => i.ruleId === 'bean_orders_inventory_gap');
    expect(hit).toBeDefined();
    expect(hit!.summary).toContain('คุณเอ (ค้างชำระเงิน)');
    expect(hit!.summary).toContain('ทัพพ์ (ค้างจัดส่ง)');
  });

  test('bean_orders_inventory_gap does not fire when no pending orders', () => {
    const insights = evaluateInsightRules(sampleSnapshot({ pendingBeanOrders: [] }));
    expect(insights.find((i) => i.ruleId === 'bean_orders_inventory_gap')).toBeUndefined();
  });

  test('buildDailyInsightDigest merges matched rules into one notification', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([2, 5, 5, 5, 5, 5, 5], [['เอ'], ['บี']]),
        pendingBeanOrders: [{ customerName: 'คุณซี', statusLabel: 'ค้างชำระเงิน' }],
      }),
    );
    const digest = buildDailyInsightDigest(insights);
    expect(digest).not.toBeNull();
    expect(digest!.ruleId).toBe('daily_digest');
    expect(digest!.title).toBe('แจ้งเตือนเชิงรุก');
    expect(digest!.summary).toContain('【คนน้อย】');
    expect(digest!.summary).toContain('【ลาหลายคน】');
    expect(digest!.summary).toContain('【ออเดอร์เมล็ดค้าง】');
    expect(digest!.summary).toContain('คุณซี (ค้างชำระเงิน)');
  });

  test('buildDailyInsightDigest returns null when no rules match', () => {
    expect(buildDailyInsightDigest([])).toBeNull();
  });
});
