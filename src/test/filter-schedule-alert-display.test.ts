import { describe, expect, test } from 'vitest';
import type { Insight } from '@/lib/proactive-insights/types';
import {
  filterMatchedInsightsForDisplay,
  filterScheduleTaskDescription,
  rebuildInsightDigestDisplayCopy,
  serializeMatchedRuleSnapshots,
} from '@/lib/proactive-insights/filter-schedule-alert-display';

describe('filter-schedule-alert-display', () => {
  test('rebuildInsightDigestDisplayCopy drops schedule lines when dates are today or past', () => {
    const matched: Insight[] = [
      {
        ruleId: 'understaffed_low_stock',
        title: 'คนน้อย',
        summary: 'ศ. ที่ 24 (3 คน), ส. ที่ 25 (4 คน)',
        urlPath: '/schedule',
        priority: 'high',
        modules: ['schedule'],
        scheduleUnderstaffedDays: [
          { dateIso: '2026-07-24', dayIndex: 4, headcount: 3 },
          { dateIso: '2026-07-25', dayIndex: 5, headcount: 4 },
        ],
      },
      {
        ruleId: 'leave_coverage_risk',
        title: 'ลาหลายคน',
        summary: 'ศ. ที่ 24 (เอ, บี)',
        urlPath: '/schedule',
        priority: 'high',
        modules: ['schedule'],
        scheduleLeaveEntries: [
          { dateIso: '2026-07-24', dayIndex: 4, name: 'เอ' },
          { dateIso: '2026-07-24', dayIndex: 4, name: 'บี' },
        ],
      },
      {
        ruleId: 'bean_orders_inventory_gap',
        title: 'ออเดอร์เมล็ดค้าง',
        summary: 'ค้างชำระเงิน 1 รายการ',
        urlPath: '/bean-orders',
        priority: 'normal',
        modules: ['bean_orders'],
      },
    ];

    const display = rebuildInsightDigestDisplayCopy(matched, '2026-07-24');

    expect(display.hasContent).toBe(true);
    expect(display.fieldSummary).toContain('คนน้อย: ส. ที่ 25 (4 คน)');
    expect(display.fieldSummary).not.toContain('ศ. ที่ 24');
    expect(display.fieldSummary).not.toContain('ลาหลายคน:');
    expect(display.fieldSummary).toContain('ออเดอร์เมล็ดค้าง:');
  });

  test('filterMatchedInsightsForDisplay returns empty when only past schedule alerts remain', () => {
    const matched: Insight[] = [
      {
        ruleId: 'understaffed_low_stock',
        title: 'คนน้อย',
        summary: 'ศ. ที่ 24 (3 คน)',
        urlPath: '/schedule',
        priority: 'high',
        modules: ['schedule'],
        scheduleUnderstaffedDays: [{ dateIso: '2026-07-24', dayIndex: 4, headcount: 3 }],
      },
    ];

    expect(filterMatchedInsightsForDisplay(matched, '2026-07-24')).toEqual([]);
  });

  test('filterScheduleTaskDescription rebuilds secretary copy from source_ref', () => {
    const description = filterScheduleTaskDescription(
      'schedule_leave_risk',
      'ศ. ที่ 24 (เอ, บี), ส. ที่ 25 (ซี, ดี)',
      {
        leaveEntries: [
          { dateIso: '2026-07-24', dayIndex: 4, name: 'เอ' },
          { dateIso: '2026-07-24', dayIndex: 4, name: 'บี' },
          { dateIso: '2026-07-25', dayIndex: 5, name: 'ซี' },
          { dateIso: '2026-07-25', dayIndex: 5, name: 'ดี' },
        ],
      },
      '2026-07-24',
    );

    expect(description).toBe('ส. ที่ 25 (ซี, ดี)');
  });

  test('serializeMatchedRuleSnapshots keeps structured schedule fields', () => {
    const snapshots = serializeMatchedRuleSnapshots([
      {
        ruleId: 'understaffed_low_stock',
        title: 'คนน้อย',
        summary: 'ส. ที่ 25 (4 คน)',
        urlPath: '/schedule',
        priority: 'high',
        modules: ['schedule'],
        scheduleUnderstaffedDays: [{ dateIso: '2026-07-25', dayIndex: 5, headcount: 4 }],
      },
    ]);

    expect(snapshots[0]?.scheduleUnderstaffedDays).toEqual([
      { dateIso: '2026-07-25', dayIndex: 5, headcount: 4 },
    ]);
  });
});
