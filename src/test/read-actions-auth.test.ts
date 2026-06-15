import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGet, mockFrom } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockFrom: vi.fn(),
}));

import {
  fetchCountAccuracyStats,
  fetchFrequentItems,
  fetchTransactionHistory,
} from '@/app/actions/inventory-actions';
import {
  fetchSalesHistory,
  getAllProductCategories,
  getSalesMetrics,
} from '@/app/actions/sales-actions';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: mockGet,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      }),
    },
    from: mockFrom,
    rpc: vi.fn(),
  })),
}));

describe('read server actions auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockGet.mockReturnValue(undefined);
  });

  test('fetchTransactionHistory rejects unauthenticated callers', async () => {
    const result = await fetchTransactionHistory();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(result.data).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('fetchFrequentItems rejects unauthenticated callers', async () => {
    const result = await fetchFrequentItems();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(result.data).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('fetchCountAccuracyStats rejects unauthenticated callers', async () => {
    const result = await fetchCountAccuracyStats();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('fetchSalesHistory rejects unauthenticated callers', async () => {
    const result = await fetchSalesHistory();
    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('getAllProductCategories rejects unauthenticated callers', async () => {
    const result = await getAllProductCategories();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(result.categories).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('getSalesMetrics rejects unauthenticated callers', async () => {
    const result = await getSalesMetrics();
    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
