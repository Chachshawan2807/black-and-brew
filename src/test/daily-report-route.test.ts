import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

const recordLogMock = vi.fn();
const dispatchPushMock = vi.fn();
const evaluateInsightsMock = vi.fn();

vi.mock('@/lib/daily-report-notification', () => ({
  recordDailyReportNotificationLog: (...args: unknown[]) => recordLogMock(...args),
}));

vi.mock('@/lib/daily-report-web-push', () => ({
  dispatchDailyReportWebPush: (...args: unknown[]) => dispatchPushMock(...args),
}));

vi.mock('@/lib/proactive-insights/evaluate-and-dispatch', () => ({
  evaluateAndDispatchInsights: (...args: unknown[]) => evaluateInsightsMock(...args),
}));

vi.mock('@/app/actions/daily-report-actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/actions/daily-report-actions')>();
  return {
    ...actual,
    compileDailyReportData: vi.fn(
      async (schedule: 'today' | 'tomorrow', now: Date = new Date()) => {
        const reportDateIso = actual.resolveDailyReportTargetIso(schedule, now);
        const [y, m, d] = reportDateIso.split('-');
        return {
          schedule,
          dateStr: `${d}/${m}/${y}`,
          activeStaff: [{ name: 'ปิ่น', shiftText: '6:30' }],
          otherDutyStaff: [],
          offStaff: [],
          headcount: 1,
          holiday: null,
        };
      },
    ),
  };
});

describe('/api/daily-report (cron-job.org)', () => {
  let previousTz: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    recordLogMock.mockReset();
    dispatchPushMock.mockReset();
    evaluateInsightsMock.mockReset();
    process.env.CRON_SECRET = 'test-cron-secret';
    recordLogMock.mockResolvedValue({ success: true });
    dispatchPushMock.mockResolvedValue({ sent: 1, failed: 0, skipped: false });
    evaluateInsightsMock.mockResolvedValue({
      dateIso: '2026-08-26',
      matchedRules: [],
      digest: null,
      recorded: null,
      pushed: null,
    });
    previousTz = process.env.TZ;
    process.env.TZ = 'UTC';
  });

  afterEach(() => {
    vi.useRealTimers();
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  });

  test('rejects invalid ?schedule= values', async () => {
    const { GET } = await import('@/app/api/daily-report/route');
    const res = await GET(
      new Request('http://localhost/api/daily-report?schedule=next-week', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_schedule');
    expect(dispatchPushMock).not.toHaveBeenCalled();
  });

  test('05:00 ICT morning cron without param targets today (Bangkok calendar)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T22:00:00.000Z')); // 05:00 ICT Aug 26

    const { GET } = await import('@/app/api/daily-report/route');
    const res = await GET(
      new Request('http://localhost/api/daily-report', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schedule).toBe('today');
    expect(body.bangkokTodayIso).toBe('2026-08-26');
    expect(body.reportDateIso).toBe('2026-08-26');
  });

  test('05:00 ICT morning cron with ?schedule=today targets today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T22:00:00.000Z')); // 05:00 ICT Aug 26

    const { GET } = await import('@/app/api/daily-report/route');
    const res = await GET(
      new Request('http://localhost/api/daily-report?schedule=today', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schedule).toBe('today');
    expect(body.reportDateIso).toBe('2026-08-26');
  });

  test('18:00 ICT evening cron with ?schedule=tomorrow targets next Bangkok day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T11:00:00.000Z')); // 18:00 ICT Aug 25

    recordLogMock.mockImplementation(async (data) => {
      expect(data.dateStr).toBe('26/08/2026');
      return { success: true };
    });

    const { GET } = await import('@/app/api/daily-report/route');
    const res = await GET(
      new Request('http://localhost/api/daily-report?schedule=tomorrow', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schedule).toBe('tomorrow');
    expect(body.bangkokTodayIso).toBe('2026-08-25');
    expect(body.reportDateIso).toBe('2026-08-26');
    expect(body.dateStr).toBe('26/08/2026');
    expect(evaluateInsightsMock).toHaveBeenCalled();
  });
});
