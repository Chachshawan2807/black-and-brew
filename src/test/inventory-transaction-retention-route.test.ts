import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

const purgeMock = vi.fn();

vi.mock('@/lib/inventory-transaction-retention', () => ({
  DEFAULT_INVENTORY_TRANSACTION_RETENTION_MONTHS: 6,
  DEFAULT_MAX_PURGE_BATCHES: 200,
  DEFAULT_PURGE_BATCH_SIZE: 500,
  purgeInventoryTransactions: (...args: unknown[]) => purgeMock(...args),
}));

describe('/api/inventory-transaction-retention (cron)', () => {
  beforeEach(() => {
    vi.resetModules();
    purgeMock.mockReset();
    process.env.CRON_SECRET = 'test-cron-secret';
    purgeMock.mockResolvedValue({
      deleted: 12,
      batches: 1,
      retentionMonths: 6,
      batchSize: 500,
    });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  test('rejects missing cron secret', async () => {
    const { GET } = await import('@/app/api/inventory-transaction-retention/route');
    const res = await GET(new Request('http://localhost/api/inventory-transaction-retention'));
    expect(res.status).toBe(401);
  });

  test('runs purge with defaults', async () => {
    const { GET } = await import('@/app/api/inventory-transaction-retention/route');
    const res = await GET(
      new Request('http://localhost/api/inventory-transaction-retention', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
    );

    expect(res.status).toBe(200);
    expect(purgeMock).toHaveBeenCalledWith({
      retentionMonths: 6,
      batchSize: 500,
      maxBatches: 200,
    });
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      deleted: 12,
      batches: 1,
    });
  });

  test('rejects invalid retentionMonths', async () => {
    const { GET } = await import('@/app/api/inventory-transaction-retention/route');
    const res = await GET(
      new Request('http://localhost/api/inventory-transaction-retention?retentionMonths=0', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
    );

    expect(res.status).toBe(400);
    expect(purgeMock).not.toHaveBeenCalled();
  });
});
