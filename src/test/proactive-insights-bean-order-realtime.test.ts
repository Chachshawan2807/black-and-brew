import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { Insight } from '@/lib/proactive-insights/types';

const compileMock = vi.fn();
const recordMock = vi.fn();
const pushMock = vi.fn();
const markMorningPushMock = vi.fn();
const clearDigestMock = vi.fn();
const fetchSummaryMock = vi.fn();

vi.mock('@/lib/proactive-insights/compile-operational-snapshot', () => ({
  compileOperationalSnapshot: (...args: unknown[]) => compileMock(...args),
  resolveInsightTargetDateIso: () => '2026-08-11',
}));

const evaluateRulesMock = vi.fn();
const buildDigestMock = vi.fn();

vi.mock('@/lib/proactive-insights/rules', () => ({
  evaluateInsightRules: (...args: unknown[]) => evaluateRulesMock(...args),
  buildDailyInsightDigest: (...args: unknown[]) => buildDigestMock(...args),
}));

vi.mock('@/lib/insight-notification', () => ({
  recordInsightNotificationLog: (...args: unknown[]) => recordMock(...args),
  markInsightMorningPushDispatched: (...args: unknown[]) => markMorningPushMock(...args),
  fetchDailyInsightDigestSummary: (...args: unknown[]) => fetchSummaryMock(...args),
  clearDailyInsightDigestLog: (...args: unknown[]) => clearDigestMock(...args),
}));

vi.mock('@/lib/insight-web-push', () => ({
  dispatchInsightWebPush: (...args: unknown[]) => pushMock(...args),
}));

const beanDigest: Insight = {
  ruleId: 'daily_digest',
  title: 'การแจ้งเตือนที่ต้องตรวจสอบ',
  summary: 'ออเดอร์เมล็ดค้าง: ค้างชำระเงิน 1 รายการ',
  urlPath: '/dashboard',
  priority: 'normal',
  modules: ['bean_orders'],
};

describe('proactive insight realtime refresh', () => {
  beforeEach(() => {
    compileMock.mockReset();
    evaluateRulesMock.mockReset();
    buildDigestMock.mockReset();
    recordMock.mockReset();
    pushMock.mockReset();
    markMorningPushMock.mockReset();
    clearDigestMock.mockReset();
    fetchSummaryMock.mockReset();

    compileMock.mockResolvedValue({ pendingBeanOrders: [] });
    recordMock.mockResolvedValue({ success: true, skipped: false, logId: 'bb-insight-daily_digest-2026-08-11' });
    pushMock.mockResolvedValue({ sent: 1, failed: 0, skipped: false });
    markMorningPushMock.mockResolvedValue(undefined);
    clearDigestMock.mockResolvedValue(true);
    fetchSummaryMock.mockResolvedValue(
      'ออเดอร์เมล็ดค้าง: ค้างชำระเงิน 2 รายการ · ค้างจัดส่ง 1 รายการ',
    );
  });

  test('shift_update records updated digest when summary changes', async () => {
    evaluateRulesMock.mockReturnValue([
      {
        ruleId: 'understaffed_low_stock',
        title: 'คนน้อย',
        summary: 'จ. 20 3 คน',
        urlPath: '/schedule',
        priority: 'high',
        modules: ['schedule'],
      },
    ]);
    buildDigestMock.mockReturnValue({
      ...beanDigest,
      summary: 'คนน้อย: จ. 20 3 คน',
    });
    fetchSummaryMock.mockResolvedValue(
      'ออเดอร์เมล็ดค้าง: ค้างชำระเงิน 2 รายการ · ค้างจัดส่ง 1 รายการ',
    );

    const { evaluateAndDispatchInsights } = await import(
      '@/lib/proactive-insights/evaluate-and-dispatch'
    );

    await evaluateAndDispatchInsights({ trigger: 'shift_update', locale: 'th' });

    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'คนน้อย: จ. 20 3 คน' }),
      '2026-08-11',
      'th',
      expect.objectContaining({ force: true }),
    );
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  test('bean_order_update refreshes digest when summary changes even without bean rule match', async () => {
    evaluateRulesMock.mockReturnValue([]);
    buildDigestMock.mockReturnValue(null);

    const { evaluateAndDispatchInsights } = await import(
      '@/lib/proactive-insights/evaluate-and-dispatch'
    );

    const result = await evaluateAndDispatchInsights({
      trigger: 'bean_order_update',
      locale: 'th',
    });

    expect(clearDigestMock).toHaveBeenCalledWith('2026-08-11');
    expect(recordMock).not.toHaveBeenCalled();
    expect(result.digest).toBeNull();
  });

  test('bean_order_update records updated digest when summary changes', async () => {
    evaluateRulesMock.mockReturnValue([
      {
        ruleId: 'bean_orders_inventory_gap',
        title: 'ออเดอร์เมล็ดค้าง',
        summary: 'ค้างชำระเงิน 1 รายการ',
        urlPath: '/bean-orders',
        priority: 'normal',
        modules: ['bean_orders'],
      },
    ]);
    buildDigestMock.mockReturnValue(beanDigest);
    fetchSummaryMock.mockResolvedValue(
      'ออเดอร์เมล็ดค้าง: ค้างชำระเงิน 2 รายการ · ค้างจัดส่ง 1 รายการ',
    );

    const { evaluateAndDispatchInsights } = await import(
      '@/lib/proactive-insights/evaluate-and-dispatch'
    );

    await evaluateAndDispatchInsights({ trigger: 'bean_order_update', locale: 'th' });

    expect(recordMock).toHaveBeenCalledWith(
      beanDigest,
      '2026-08-11',
      'th',
      expect.objectContaining({ force: true }),
    );
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  test('bean_order_update skips when digest summary is unchanged', async () => {
    evaluateRulesMock.mockReturnValue([]);
    buildDigestMock.mockReturnValue(beanDigest);
    fetchSummaryMock.mockResolvedValue(beanDigest.summary);

    const { evaluateAndDispatchInsights } = await import(
      '@/lib/proactive-insights/evaluate-and-dispatch'
    );

    const result = await evaluateAndDispatchInsights({
      trigger: 'bean_order_update',
      locale: 'th',
    });

    expect(recordMock).not.toHaveBeenCalled();
    expect(clearDigestMock).not.toHaveBeenCalled();
    expect(result.recorded).toBeNull();
  });
});
