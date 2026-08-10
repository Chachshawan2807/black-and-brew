import { describe, expect, test, vi, beforeEach } from 'vitest';

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
      new Request('http://localhost/api/insight-alerts', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.digestSent).toBe(true);
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'cron', locale: 'th', force: false }),
    );
  });

  test('passes force=1 for cron-job.org test re-runs', async () => {
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
      expect.objectContaining({ trigger: 'cron', locale: 'th', force: true }),
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
