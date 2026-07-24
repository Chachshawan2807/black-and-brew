import { describe, expect, test } from 'vitest';
import type { OperationalSnapshot, WeeklyDaySchedule } from '@/lib/proactive-insights/types';
import { evaluateInsightRules } from '@/lib/proactive-insights/rules';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';

function makeWeekDays(
  headcounts: number[],
  leaveCounts: number[] = Array(7).fill(0),
): WeeklyDaySchedule[] {
  return headcounts.map((headcount, dayIndex) => ({
    dateIso: `2026-07-${20 + dayIndex}`,
    dayIndex,
    headcount,
    leaveCount: leaveCounts[dayIndex] ?? 0,
  }));
}

function sampleSnapshot(overrides: Partial<OperationalSnapshot> = {}): OperationalSnapshot {
  const weeklyDays = overrides.weeklyDays ?? makeWeekDays([5, 5, 5, 5, 5, 5, 5]);
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
    pendingBeanOrders: 0,
    yesterdaySalesTotal: 0,
    upcomingHoliday: null,
    ...overrides,
  };
}

describe('evaluateInsightRules', () => {
  test('understaffed_low_stock fires when any weekday is at or below its limit', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([3, 5, 4, 5, 3, 4, 5]),
      }),
    );
    const hit = insights.find((i) => i.ruleId === 'understaffed_low_stock');
    expect(hit).toBeDefined();
    expect(hit!.title).toBe('คนน้อย');
    expect(hit!.urlPath).toBe('/schedule');
    expect(hit!.summary).toContain('จ. 3 คน');
    expect(hit!.summary).toContain('ศ. 3 คน');
  });

  test('understaffed_low_stock fires at Wed/Thu limit of 4', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 4, 4, 5, 5, 5]),
      }),
    );
    expect(insights.find((i) => i.ruleId === 'understaffed_low_stock')).toBeDefined();
  });

  test('understaffed_low_stock does not fire when all days are above limits', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([4, 4, 5, 5, 4, 5, 5]),
      }),
    );
    expect(insights.find((i) => i.ruleId === 'understaffed_low_stock')).toBeUndefined();
  });

  test('leave_coverage_risk fires when weekly leave total meets threshold', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 5, 5, 5, 5, 5], [1, 1, 0, 0, 0, 0, 0]),
      }),
    );
    const hit = insights.find((i) => i.ruleId === 'leave_coverage_risk');
    expect(hit).toBeDefined();
    expect(hit!.title).toBe('ลาหลายคน');
    expect(hit!.urlPath).toBe('/schedule');
    expect(hit!.summary).toContain('2');
  });

  test('leave_coverage_risk does not fire below weekly leave threshold', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([5, 5, 5, 5, 5, 5, 5], [1, 0, 0, 0, 0, 0, 0]),
      }),
    );
    expect(insights.find((i) => i.ruleId === 'leave_coverage_risk')).toBeUndefined();
    expect(INSIGHT_THRESHOLDS.leaveCoverageMinLeave).toBe(2);
  });

  test('bean_orders_inventory_gap fires when pending bean orders meet threshold', () => {
    const insights = evaluateInsightRules(sampleSnapshot({ pendingBeanOrders: 1 }));
    const hit = insights.find((i) => i.ruleId === 'bean_orders_inventory_gap');
    expect(hit).toBeDefined();
    expect(hit!.title).toBe('ออเดอร์เมล็ดค้าง');
    expect(hit!.urlPath).toBe('/bean-orders');
    expect(hit!.summary).toContain('1');
    expect(hit!.summary).not.toContain('สต็อก');
  });

  test('bean_orders_inventory_gap does not fire below pending threshold', () => {
    const insights = evaluateInsightRules(sampleSnapshot({ pendingBeanOrders: 0 }));
    expect(insights.find((i) => i.ruleId === 'bean_orders_inventory_gap')).toBeUndefined();
  });

  test('returns multiple insights when several rules match', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([2, 5, 5, 5, 5, 5, 5], [1, 1, 0, 0, 0, 0, 0]),
        pendingBeanOrders: 1,
      }),
    );
    expect(insights.length).toBeGreaterThanOrEqual(3);
    expect(new Set(insights.map((i) => i.ruleId)).size).toBe(3);
  });

  test('each insight has stable ruleId and priority', () => {
    const insights = evaluateInsightRules(
      sampleSnapshot({
        weeklyDays: makeWeekDays([2, 5, 5, 5, 5, 5, 5]),
      }),
    );
    for (const insight of insights) {
      expect(insight.ruleId).toMatch(/^[a-z_]+$/);
      expect(['normal', 'high']).toContain(insight.priority);
      expect(insight.title.length).toBeGreaterThan(0);
    }
  });
});
