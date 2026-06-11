import { describe, expect, test } from 'vitest';
import {
  buildSalesSnapshot,
  buildScheduleEntries,
  buildScheduleEntriesFromFormattedShifts,
  buildAlerts,
  buildDiff,
  buildSignalsList,
} from '@/app/actions/market-insights-context';
import {
  behaviorTrendsSchema,
  strategyActionsSchema,
  isMarketInsightsV2,
  type MarketInsightsV2,
} from '@/app/actions/market-insights-types';
import type { SalesMetrics } from '@/app/actions/sales-actions';

const sampleMetrics: SalesMetrics = {
  overview: {
    totalRevenue: 150000,
    totalQuantity: 1200,
    totalTransactions: 450,
    avgTransactionValue: 333.33,
    dateRange: { start: '2026-01-01', end: '2026-03-01', totalMonths: 3 },
  },
  dailyMetrics: [],
  monthlyMetrics: [
    { year: 2026, month: 1, totalRevenue: 45000, totalQuantity: 380, transactionCount: 140, avgDailyRevenue: 1500 },
    { year: 2026, month: 2, totalRevenue: 50000, totalQuantity: 400, transactionCount: 150, avgDailyRevenue: 1666 },
  ],
  categoryMetrics: [
    { category: 'กาแฟ', totalRevenue: 90000, totalQuantity: 700, transactionCount: 300, revenuePercentage: 60 },
    { category: 'ชา', totalRevenue: 60000, totalQuantity: 500, transactionCount: 150, revenuePercentage: 40 },
  ],
  topProducts: [
    { productName: 'ลาเต้', category: 'กาแฟ', totalRevenue: 30000, totalQuantity: 200 },
    { productName: 'อเมริกาโน่', category: 'กาแฟ', totalRevenue: 20000, totalQuantity: 180 },
  ],
  allProducts: [],
  comparisons: {
    mom: { currentMonthRevenue: 50000, previousMonthRevenue: 45000, changePercentage: 11.1, changeAbsolute: 5000 },
    yoy: null,
  },
};

describe('buildSalesSnapshot', () => {
  test('extracts MoM, top products and category breakdown', () => {
    const snap = buildSalesSnapshot(sampleMetrics);
    expect(snap.momChangePercentage).toBe(11.1);
    expect(snap.momDetail).toMatchObject({
      currentLabel: '2026-02',
      previousLabel: '2026-01',
      changeAbsolute: 5000,
    });
    expect(snap.topProducts[0]).toMatchObject({ productName: 'ลาเต้', totalQuantity: 200 });
    expect(snap.categoryBreakdown[0]).toMatchObject({ category: 'กาแฟ', revenuePercentage: 60 });
    expect(snap.monthlyTrend).toHaveLength(2);
  });

  test('returns empty snapshot for null metrics', () => {
    const snap = buildSalesSnapshot(null);
    expect(snap.momChangePercentage).toBeNull();
    expect(snap.momDetail).toBeNull();
    expect(snap.topProducts).toEqual([]);
    expect(snap.monthlyTrend).toEqual([]);
  });
});

describe('buildScheduleEntries', () => {
  test('maps snake_case schedule rows to camelCase', () => {
    const entries = buildScheduleEntries([
      { full_name: 'แอน', start_time_local: '08:00', end_time_local: '16:00', status: 'active' },
    ]);
    expect(entries[0]).toEqual({ fullName: 'แอน', start: '08:00', end: '16:00', status: 'active' });
  });
});

describe('buildScheduleEntriesFromFormattedShifts', () => {
  test('orders working staff by shift time then schedule row', () => {
    const entries = buildScheduleEntriesFromFormattedShifts({
      front_store: [
        { row_order: 1, schedule_order: 0, name: 'นิต้า', shift: '6:30', category: 'front_store' },
        { row_order: 2, schedule_order: 1, name: 'ปิ่น', shift: '7:00', category: 'front_store' },
        { row_order: 4, schedule_order: 3, name: 'เม', shift: '7:00', category: 'front_store' },
      ],
      other_duty: [
        { row_order: 6, schedule_order: 5, name: 'ชัช', shift: 'ไปสาขา 2', category: 'other_duty' },
        { row_order: 7, schedule_order: 8, name: 'ล่า', shift: 'ร้านซักผ้า', category: 'other_duty' },
      ],
      off_or_leave: [],
      all_staff: [],
    });

    expect(entries.map((entry) => entry.fullName)).toEqual(['นิต้า', 'ปิ่น', 'เม', 'ชัช', 'ล่า']);
  });
});

describe('buildAlerts', () => {
  test('flags stockout risk when a top seller ingredient is low', () => {
    const alerts = buildAlerts(
      [{ name: 'ลาเต้', stock: 1, orderPoint: 5, targetStock: 20, unit: 'L', isLowStock: true }],
      ['ลาเต้'],
      'แดดจัด 30°C'
    );
    expect(alerts.some((a) => a.type === 'stockout_risk')).toBe(true);
    expect(alerts.find((a) => a.type === 'stockout_risk')?.linkedItems).toContain('ลาเต้');
  });

  test('flags overstock and hot-weather opportunity', () => {
    const alerts = buildAlerts(
      [{ name: 'แก้วกระดาษ', stock: 100, orderPoint: 10, targetStock: 30, unit: 'ชิ้น', isLowStock: false }],
      [],
      'ท้องฟ้าแจ่มใส 35°C'
    );
    expect(alerts.some((a) => a.type === 'overstock')).toBe(true);
    expect(alerts.some((a) => a.type === 'opportunity')).toBe(true);
  });

  test('flags weather alert when rainy', () => {
    const alerts = buildAlerts([], [], 'ฝนตกหนัก 27°C');
    expect(alerts.some((a) => a.type === 'weather')).toBe(true);
  });
});

describe('buildSignalsList', () => {
  test('produces a discrete list of signals', () => {
    const list = buildSignalsList(
      sampleMetrics,
      [{ name: 'นม', stock: 2, isLowStock: true }],
      ['ลาเต้'],
      'แดด 35°C',
      'matcha trend rising'
    );
    expect(Array.isArray(list)).toBe(true);
    expect(list).toContain('weather:hot');
    expect(list).toContain('market:matcha_interest');
  });
});

const prev: MarketInsightsV2 = {
  version: 2,
  generatedAt: '2026-06-08T00:00:00.000Z',
  context: {
    weather: { current: null, hourly: [], operatingSummary: 'N/A' },
    signals: ['weather:hot'],
    salesSnapshot: { momChangePercentage: null, momDetail: null, topProducts: [], categoryBreakdown: [], monthlyTrend: [] },
    scheduleToday: [],
    shiftCount: 0,
    upcomingHolidays: [],
    alerts: [],
    competitorAnalysis: null,
  },
  insights: { behavior: [], trends: [], strategy: [] },
  actions: [{ id: 'act-1', title: 'ดันเมนูเย็น', priority: 1, timeframe: 'สัปดาห์นี้', expectedImpact: 'เพิ่มยอด', linkedProducts: [] }],
  sources: [],
};

describe('buildDiff', () => {
  test('returns new signals and changed actions vs previous run', () => {
    const diff = buildDiff(
      { signals: ['weather:hot', 'market:matcha_interest'], actionTitles: ['ดันเมนูเย็น', 'ออกเมนูมัทฉะ'] },
      prev
    );
    expect(diff?.newSignals).toEqual(['market:matcha_interest']);
    expect(diff?.changedActionTitles).toEqual(['ออกเมนูมัทฉะ']);
  });

  test('returns undefined when nothing changed', () => {
    expect(buildDiff({ signals: ['weather:hot'], actionTitles: ['ดันเมนูเย็น'] }, prev)).toBeUndefined();
  });

  test('returns undefined with no previous run', () => {
    expect(buildDiff({ signals: ['x'], actionTitles: ['y'] }, null)).toBeUndefined();
  });
});

describe('Zod schemas', () => {
  test('behaviorTrendsSchema validates a well-formed object', () => {
    const parsed = behaviorTrendsSchema.parse({
      behavior: [{ text: 'ลูกค้าชอบช่วงเย็น', confidence: 'high', reason: 'ยอดพีคเย็น' }],
      trends: [{ text: 'มัทฉะมาแรง', confidence: 'medium' }],
    });
    expect(parsed.behavior).toHaveLength(1);
  });

  test('strategyActionsSchema applies linkedProducts default', () => {
    const parsed = strategyActionsSchema.parse({
      strategy: [{ text: 'จัดโปรเย็น', confidence: 'high' }],
      actions: [{ title: 'ลด 10% เครื่องดื่มเย็น', priority: 1, timeframe: 'สัปดาห์นี้', expectedImpact: 'เพิ่มยอด' }],
    });
    expect(parsed.actions[0].linkedProducts).toEqual([]);
  });

  test('strategyActionsSchema rejects invalid priority', () => {
    expect(() =>
      strategyActionsSchema.parse({
        strategy: [{ text: 'x', confidence: 'low' }],
        actions: [{ title: 'y', priority: 9, timeframe: 'now', expectedImpact: 'z' }],
      })
    ).toThrow();
  });
});

describe('isMarketInsightsV2', () => {
  test('accepts a complete v2 payload', () => {
    expect(isMarketInsightsV2(prev)).toBe(true);
  });

  test('rejects legacy, partial, and invalid payloads', () => {
    // version flag only, but missing required nested shape (stale/partial cache)
    expect(isMarketInsightsV2({ version: 2 })).toBe(false);
    expect(isMarketInsightsV2({ version: 2, context: { alerts: [] } })).toBe(false);
    expect(isMarketInsightsV2({ behavior: 'x', trends: 'y', strategy: 'z' })).toBe(false);
    expect(isMarketInsightsV2(null)).toBe(false);
  });
});
