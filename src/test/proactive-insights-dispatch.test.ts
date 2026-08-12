import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { Insight } from '@/lib/proactive-insights/types';

const compileMock = vi.fn();
const recordMock = vi.fn();
const pushMock = vi.fn();
const markMorningPushMock = vi.fn();

vi.mock('@/lib/proactive-insights/compile-operational-snapshot', () => ({
  compileOperationalSnapshot: (...args: unknown[]) => compileMock(...args),
  resolveInsightTargetDateIso: () => '2026-08-11',
}));

vi.mock('@/lib/proactive-insights/rules', () => ({
  evaluateInsightRules: () => [
    {
      ruleId: 'bean_orders_inventory_gap',
      title: 'ออเดอร์เมล็ดค้าง',
      summary: 'ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 1 รายการ',
      urlPath: '/bean-orders',
      priority: 'normal',
      modules: ['bean_orders'],
    },
  ],
  buildDailyInsightDigest: (insights: Insight[]) =>
    insights.length > 0
      ? {
          ruleId: 'daily_digest',
          title: 'การแจ้งเตือนที่ต้องตรวจสอบ',
          summary: 'ออเดอร์เมล็ดค้าง: ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 1 รายการ',
          urlPath: '/dashboard',
          priority: 'normal',
          modules: ['bean_orders'],
        }
      : null,
}));

vi.mock('@/lib/insight-notification', () => ({
  recordInsightNotificationLog: (...args: unknown[]) => recordMock(...args),
  markInsightMorningPushDispatched: (...args: unknown[]) => markMorningPushMock(...args),
  fetchDailyInsightDigestSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/insight-web-push', () => ({
  dispatchInsightWebPush: (...args: unknown[]) => pushMock(...args),
}));

describe('evaluateAndDispatchInsights', () => {
  beforeEach(() => {
    compileMock.mockReset();
    recordMock.mockReset();
    pushMock.mockReset();
    markMorningPushMock.mockReset();
    compileMock.mockResolvedValue({ pendingBeanOrders: [] });
    recordMock.mockResolvedValue({ success: true, skipped: false, logId: 'bb-insight-daily_digest-2026-08-11' });
    pushMock.mockResolvedValue({ sent: 1, failed: 0, skipped: false });
    markMorningPushMock.mockResolvedValue(undefined);
  });

  test('records and pushes only for cron trigger', async () => {
    const { evaluateAndDispatchInsights } = await import(
      '@/lib/proactive-insights/evaluate-and-dispatch'
    );

    const cronResult = await evaluateAndDispatchInsights({ trigger: 'cron', locale: 'th' });
    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(cronResult.recorded).not.toBeNull();
    expect(cronResult.pushed).not.toBeNull();

    recordMock.mockClear();
    pushMock.mockClear();

    const manualResult = await evaluateAndDispatchInsights({ trigger: 'manual', locale: 'th' });
    expect(recordMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(manualResult.digest?.title).toBe('การแจ้งเตือนที่ต้องตรวจสอบ');
    expect(manualResult.recorded).toBeNull();
    expect(manualResult.pushed).toBeNull();
  });

  test('bean_order_update records and pushes when pending bean orders match', async () => {
    const { evaluateAndDispatchInsights } = await import(
      '@/lib/proactive-insights/evaluate-and-dispatch'
    );

    const result = await evaluateAndDispatchInsights({
      trigger: 'bean_order_update',
      locale: 'th',
    });
    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(result.recorded).not.toBeNull();
    expect(result.pushed).not.toBeNull();
  });

  test('cron skips push only when scheduled digest was already sent today', async () => {
    const { evaluateAndDispatchInsights } = await import(
      '@/lib/proactive-insights/evaluate-and-dispatch'
    );

    recordMock.mockResolvedValue({
      success: true,
      skipped: true,
      logId: 'bb-insight-daily_digest-2026-08-11',
    });

    const skippedResult = await evaluateAndDispatchInsights({ trigger: 'cron', locale: 'th' });
    expect(pushMock).not.toHaveBeenCalled();
    expect(skippedResult.pushed?.skipped).toBe(true);
    expect(markMorningPushMock).not.toHaveBeenCalled();

    recordMock.mockResolvedValue({
      success: true,
      skipped: false,
      logId: 'bb-insight-daily_digest-2026-08-11',
    });
    pushMock.mockResolvedValue({ sent: 2, failed: 0, skipped: false });

    const pushResult = await evaluateAndDispatchInsights({ trigger: 'cron', locale: 'th' });
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushResult.pushed?.sent).toBe(2);
    expect(markMorningPushMock).toHaveBeenCalledWith('bb-insight-daily_digest-2026-08-11', {
      scheduledPushDateIso: '2026-08-11',
    });
  });
});
