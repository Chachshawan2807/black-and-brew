import { describe, expect, test } from 'vitest';
import {
  buildSalesContext,
  buildInventoryContext,
  buildScheduleContext,
  buildAnalyticalSignals,
} from '@/app/actions/market-insights-context';
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
  monthlyMetrics: [{ year: 2026, month: 2, totalRevenue: 50000, totalQuantity: 400, transactionCount: 150, avgDailyRevenue: 1666 }],
  categoryMetrics: [
    { category: 'กาแฟ', totalRevenue: 90000, totalQuantity: 700, transactionCount: 300, revenuePercentage: 60 },
    { category: 'ชา', totalRevenue: 60000, totalQuantity: 500, transactionCount: 150, revenuePercentage: 40 },
  ],
  topProducts: [
    { productName: 'ลาเต้', category: 'กาแฟ', totalRevenue: 30000, totalQuantity: 200 },
  ],
  allProducts: [],
  comparisons: {
    mom: { currentMonthRevenue: 50000, previousMonthRevenue: 45000, changePercentage: 11.1, changeAbsolute: 5000 },
    yoy: null,
  },
};

describe('Market Insights Context Builders', () => {
  test('buildSalesContext produces compact fact string with top products and MoM', () => {
    const ctx = buildSalesContext(sampleMetrics);
    expect(ctx).toContain('rev=150000');
    expect(ctx).toContain('ลาเต้(200/30000)');
    expect(ctx).toContain('MoM:+11.1%');
  });

  test('buildSalesContext returns N/A when no metrics', () => {
    expect(buildSalesContext(null)).toBe('N/A');
  });

  test('buildInventoryContext lists low stock and recent transactions', () => {
    const ctx = buildInventoryContext(
      [
        { name: 'นม', stock: 2, orderPoint: 5, targetStock: 20, unit: 'L', isLowStock: true },
        { name: 'กาแฟ', stock: 50, orderPoint: 10, targetStock: 30, unit: 'kg', isLowStock: false },
      ],
      [{ name: 'นม', qty_to_order: 18, unit: 'L' }],
      [{ item_name: 'นม', type: 'OUT', quantity: 3, created_at_local: '2026-06-07' }]
    );
    expect(ctx).toContain('low=[นม:2L]');
    expect(ctx).toContain('PO:[นม+18L]');
    expect(ctx).toContain('OUT นม x3');
  });

  test('buildScheduleContext formats staff shifts', () => {
    const ctx = buildScheduleContext([
      { full_name: 'แอน', start_time_local: '08:00', end_time_local: '16:00', status: 'active' },
    ]);
    expect(ctx).toContain('แอน 08:00-16:00(active)');
  });

  test('buildAnalyticalSignals detects momentum and weather patterns', () => {
    const signals = buildAnalyticalSignals(
      sampleMetrics,
      [{ name: 'นม', stock: 2, isLowStock: true }],
      ['ลาเต้'],
      'ท้องฟ้าแจ่มใส 35°C',
      'matcha trend rising in cafes'
    );
    expect(signals).toContain('sales_momentum:positive');
    expect(signals).toContain('weather:hot');
    expect(signals).toContain('market:matcha_interest');
  });
});
