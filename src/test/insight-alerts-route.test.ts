import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { THAI_TIMEZONE } from '@/lib/timezone';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

const evaluateMock = vi.fn();

vi.mock('@/lib/proactive-insights/evaluate-and-dispatch', () => ({
  evaluateAndDispatchInsights: (...args: unknown[]) => evaluateMock(...args),
}));

describe('/api/insight-alerts', () => {
  beforeEach(() => {
    vi.resetModules();
    evaluateMock.mockReset();
    process.env.CRON_SECRET = 'test-cron-secret';
    vi.useFakeTimers();
    vi.setSystemTime(fromZonedTime('2026-09-08T07:00:00', THAI_TIMEZONE));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('rejects missing authorization', async () => {
    const { GET } = await import('@/app/api/insight-alerts/route');
    const res = await GET(new Request('http://localhost/api/insight-alerts'));
    expect(res.status).toBe(401);
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  test('rejects wrong secret', async () => {
    const { GET } = await import('@/app/api/insight-alerts/route');
    const res = await GET(
      new Request('http://localhost/api/insight-alerts', {
        headers: { authorization: 'Bearer wrong' },
      }),
    );
    expect(res.status).toBe(401);
  });

  test('dispatches daily digest at 07:00 ICT cron', async () => {
    evaluateMock.mockResolvedValue({
      dateIso: '2026-07-24',
      trigger: 'cron',
      matchedRules: [{ ruleId: 'leave_coverage_risk' }],
      digest: { ruleId: 'daily_digest', title: 'การแจ้งเตือนที่ต้องตรวจสอบ' },
      recorded: {
        ruleId: 'daily_digest',
        logId: 'bb-insight-daily_digest-2026-07-24',
        skipped: false,
      },
      pushed: { ruleId: 'daily_digest', sent: 1, failed: 0, skipped: false },
    });

    const { GET } = await import('@/app/api/insight-alerts/route');
    const res = await GET(
      new Request('http://localhost/api/insight-alerts?window=morning', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.window).toBe('morning');
    expect(body.digestSent).toBe(true);
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'cron', locale: 'th', force: false, window: 'morning' }),
    );
  });

  test('rejects morning cron outside 07:00 ICT window', async () => {
    vi.setSystemTime(fromZonedTime('2026-09-08T07:19:00', THAI_TIMEZONE));

    const { GET } = await import('@/app/api/insight-alerts/route');
    const res = await GET(
      new Request('http://localhost/api/insight-alerts?window=morning', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.skipReason).toBe('outside_cron_window');
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  test('evening window records without push', async () => {
    vi.setSystemTime(fromZonedTime('2026-09-08T17:00:00', THAI_TIMEZONE));
    evaluateMock.mockResolvedValue({
      dateIso: '2026-09-08',
      trigger: 'cron',
      matchedRules: [{ ruleId: 'bean_orders_inventory_gap' }],
      digest: { ruleId: 'daily_digest', title: 'การแจ้งเตือนที่ต้องตรวจสอบ' },
      recorded: {
        ruleId: 'daily_digest',
        logId: 'bb-insight-daily_digest-2026-09-08',
        skipped: false,
      },
      pushed: { ruleId: 'daily_digest', sent: 0, failed: 0, skipped: true },
    });

    const { GET } = await import('@/app/api/insight-alerts/route');
    const res = await GET(
      new Request('http://localhost/api/insight-alerts?window=evening', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.window).toBe('evening');
    expect(body.digestSent).toBe(false);
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ window: 'evening' }),
    );
  });

  test('passes force=1 for cron-job.org test re-runs', async () => {
    vi.setSystemTime(fromZonedTime('2026-09-08T07:19:00', THAI_TIMEZONE));
    evaluateMock.mockResolvedValue({
      dateIso: '2026-08-11',
      trigger: 'cron',
      matchedRules: [{ ruleId: 'understaffed_low_stock' }],
      digest: { ruleId: 'daily_digest', title: 'การแจ้งเตือนที่ต้องตรวจสอบ' },
      recorded: {
        ruleId: 'daily_digest',
        logId: 'bb-insight-daily_digest-2026-08-11',
        skipped: false,
      },
      pushed: { ruleId: 'daily_digest', sent: 1, failed: 0, skipped: false },
    });

    const { GET } = await import('@/app/api/insight-alerts/route');
    const res = await GET(
      new Request('http://localhost/api/insight-alerts?force=1', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.force).toBe(true);
    expect(body.digestSent).toBe(true);
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'cron', locale: 'th', force: true, window: 'morning' }),
    );
  });

  test('returns success with no digest when no rules matched', async () => {
    evaluateMock.mockResolvedValue({
      dateIso: '2026-07-24',
      trigger: 'cron',
      matchedRules: [],
      digest: null,
      recorded: null,
      pushed: null,
    });

    const { GET } = await import('@/app/api/insight-alerts/route');
    const res = await GET(
      new Request('http://localhost/api/insight-alerts', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matchedRuleCount).toBe(0);
    expect(body.digestSent).toBe(false);
  });
});
