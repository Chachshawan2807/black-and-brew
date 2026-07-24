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

  test('dispatches morning window by default', async () => {
    evaluateMock.mockResolvedValue({
      dateIso: '2026-07-24',
      trigger: 'cron',
      insights: [{ ruleId: 'leave_coverage_risk' }],
      recorded: [
        {
          ruleId: 'leave_coverage_risk',
          logId: 'bb-insight-leave_coverage_risk-2026-07-24',
          skipped: false,
        },
      ],
      pushed: [{ ruleId: 'leave_coverage_risk', sent: 1, failed: 0, skipped: false }],
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
    expect(body.window).toBe('morning');
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'cron', window: 'morning' }),
    );
  });

  test('accepts evening window query param', async () => {
    evaluateMock.mockResolvedValue({
      dateIso: '2026-07-24',
      trigger: 'cron',
      insights: [],
      recorded: [],
      pushed: [],
    });

    const { GET } = await import('@/app/api/insight-alerts/route');
    const res = await GET(
      new Request('http://localhost/api/insight-alerts?window=evening', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );
    expect(res.status).toBe(200);
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ window: 'evening' }),
    );
  });
});
