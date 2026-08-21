import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const fetchTransactionHistoryClient = vi.fn();

vi.mock('@/lib/inventory-history-client', () => ({
  fetchTransactionHistoryClient: (...args: unknown[]) => fetchTransactionHistoryClient(...args),
}));

describe('inventory history page cache', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchTransactionHistoryClient.mockReset();
    fetchTransactionHistoryClient.mockResolvedValue({
      success: true,
      data: [{ id: 'tx-1' }],
      hasMore: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function loadModule() {
    return import('@/lib/inventory-history-prefetch');
  }

  test('builds stable cache keys from type and search query', async () => {
    const mod = await loadModule();
    expect(mod.historyCacheKey({ type: 'IN', searchQuery: '  Coffee ' })).toBe('IN|coffee');
    expect(mod.historyCacheKey({ type: 'ALL' })).toBe('ALL|');
    expect(mod.historyCacheKey({})).toBe('ALL|');
  });

  test('set/get returns first-page rows and hasMore', async () => {
    const mod = await loadModule();
    const rows = [{ id: 'a' }];
    mod.setHistoryPageCache({ type: 'OUT', searchQuery: '' }, { data: rows, hasMore: true });
    const hit = mod.getHistoryPageCache({ type: 'OUT' });
    expect(hit?.data).toEqual(rows);
    expect(hit?.hasMore).toBe(true);
  });

  test('fresh entry skips network on prefetch; stale entry still readable', async () => {
    vi.useFakeTimers();
    const mod = await loadModule();
    mod.setHistoryPageCache({ type: 'ALL' }, { data: [{ id: 'cached' }], hasMore: false });

    await mod.prefetchInventoryHistoryFirstPage();
    expect(fetchTransactionHistoryClient).not.toHaveBeenCalled();
    expect(mod.isInventoryHistoryPrefetchFresh()).toBe(true);

    vi.advanceTimersByTime(30_001);
    expect(mod.isInventoryHistoryPrefetchFresh()).toBe(false);
    expect(mod.getHistoryPageCache({ type: 'ALL' })?.data).toEqual([{ id: 'cached' }]);
  });

  test('invalidate clears every cached page', async () => {
    const mod = await loadModule();
    mod.setHistoryPageCache({ type: 'ALL' }, { data: [{ id: '1' }], hasMore: false });
    mod.setHistoryPageCache({ type: 'IN' }, { data: [{ id: '2' }], hasMore: false });
    mod.invalidateInventoryHistoryPrefetch();
    expect(mod.getHistoryPageCache({ type: 'ALL' })).toBeNull();
    expect(mod.getHistoryPageCache({ type: 'IN' })).toBeNull();
  });

  test('prefetch dedupes in-flight requests per key and stores result', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchTransactionHistoryClient.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const mod = await loadModule();
    const p1 = mod.prefetchInventoryHistoryPage({ type: 'ADJUST' });
    const p2 = mod.prefetchInventoryHistoryPage({ type: 'ADJUST' });
    expect(fetchTransactionHistoryClient).toHaveBeenCalledTimes(1);

    resolveFetch({ success: true, data: [{ id: 'adj' }], hasMore: true });
    await Promise.all([p1, p2]);

    expect(mod.getHistoryPageCache({ type: 'ADJUST' })?.data).toEqual([{ id: 'adj' }]);
    expect(mod.getHistoryPageCache({ type: 'ADJUST' })?.hasMore).toBe(true);
  });
});
