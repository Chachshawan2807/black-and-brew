import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

const purgeMock = vi.fn();

vi.mock('@/lib/data-change-log-retention', () => ({
  DEFAULT_DATA_CHANGE_LOG_RETENTION_DAYS: 90,
  DEFAULT_MAX_PURGE_BATCHES: 50,
  DEFAULT_PURGE_BATCH_SIZE: 1000,
  purgeDataChangeLogs: (...args: unknown[]) => purgeMock(...args),
}));

describe('/api/data-change-log-retention (cron)', () => {
  beforeEach(() => {
    vi.resetModules();
    purgeMock.mockReset();
    process.env.CRON_SECRET = 'test-cron-secret';
    purgeMock.mockResolvedValue({
      deleted: 42,
      batches: 1,
      retentionDays: 90,
      batchSize: 1000,
    });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  test('rejects missing cron secret', async () => {
    const { GET } = await import('@/app/api/data-change-log-retention/route');
    const res = await GET(new Request('http://localhost/api/data-change-log-retention'));
    expect(res.status).toBe(401);
  });

  test('runs purge with defaults', async () => {
    const { GET } = await import('@/app/api/data-change-log-retention/route');
    const res = await GET(
      new Request('http://localhost/api/data-change-log-retention', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
    );

    expect(res.status).toBe(200);
    expect(purgeMock).toHaveBeenCalledWith({
      retentionDays: 90,
      batchSize: 1000,
      maxBatches: 50,
    });
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      deleted: 42,
      batches: 1,
    });
  });

  test('rejects invalid retentionDays', async () => {
    const { GET } = await import('@/app/api/data-change-log-retention/route');
    const res = await GET(
      new Request('http://localhost/api/data-change-log-retention?retentionDays=0', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
    );

    expect(res.status).toBe(400);
    expect(purgeMock).not.toHaveBeenCalled();
  });
});
