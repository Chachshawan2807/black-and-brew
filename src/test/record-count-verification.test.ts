import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGet, mockFrom, mockEq, mockMaybeSingle, mockInsert } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockInsert = vi.fn(async () => ({ error: null }));
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
  }));

  return {
    mockGet: vi.fn(),
    mockFrom,
    mockEq,
    mockMaybeSingle,
    mockInsert,
  };
});

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

vi.mock('@/lib/session-revocation', () => ({
  isSessionFingerprintRevoked: vi.fn(async () => false),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: mockFrom,
    rpc: vi.fn(),
  })),
}));

import { recordCountVerification } from '@/app/actions/inventory-actions';

const ITEM_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('recordCountVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      return undefined;
    });
    mockMaybeSingle.mockResolvedValue({ data: { stock: 7 }, error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  test('uses database stock as baseline even when client state is stale', async () => {
    const result = await recordCountVerification(ITEM_ID, 5);

    expect(mockFrom).toHaveBeenCalledWith('inventory_items');
    expect(mockEq).toHaveBeenCalledWith('id', ITEM_ID);
    expect(result).toMatchObject({
      success: true,
      matched: false,
      systemStockQty: 7,
      countedQty: 5,
    });
    expect(mockInsert).toHaveBeenCalledWith({
      inventory_item_id: ITEM_ID,
      counted_qty: 5,
      system_stock_qty: 7,
      matched: false,
    });
  });

  test('records match when counted qty equals database stock', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { stock: 10 }, error: null });

    const result = await recordCountVerification(ITEM_ID, 10);

    expect(result).toMatchObject({
      success: true,
      matched: true,
      systemStockQty: 10,
    });
  });
});
