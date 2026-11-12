import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const rpcMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: rpcMock,
  })),
}));

vi.mock('@/lib/security/server-auth', () => ({
  requireServiceRoleKey: () => 'service-role-key',
}));

describe('purgeInventoryTransactions', () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  test('loops until batch smaller than batchSize', async () => {
    rpcMock.mockResolvedValueOnce({ data: 500, error: null });
    rpcMock.mockResolvedValueOnce({ data: 120, error: null });

    const { purgeInventoryTransactions } = await import('@/lib/inventory-transaction-retention');
    const result = await purgeInventoryTransactions({
      retentionMonths: 6,
      batchSize: 500,
      maxBatches: 10,
    });

    expect(result).toEqual({
      deleted: 620,
      batches: 2,
      retentionMonths: 6,
      batchSize: 500,
    });
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenCalledWith('purge_inventory_transactions_batch', {
      p_retention_months: 6,
      p_batch_size: 500,
    });
  });

  test('throws when RPC missing', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Could not find the function', code: 'PGRST202' },
    });

    const { purgeInventoryTransactions } = await import('@/lib/inventory-transaction-retention');
    await expect(purgeInventoryTransactions()).rejects.toThrow(/not installed/i);
  });
});
