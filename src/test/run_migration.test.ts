import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Cookie mock ──────────────────────────────────────────────────────────────
const mockGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: mockGet,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockSelectOrder = vi.fn();
const mockEq = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({ order: mockSelectOrder }),
      update: vi.fn().mockReturnValue({ eq: mockEq }),
    })),
  })),
}));

import { runInventoryMigration } from '@/app/actions/migrate-inventory-sort-order';

describe('Inventory Sorting Migration — unit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    // Authenticated writable session: PIN verified, not read-only
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      return undefined;
    });
    // Default: updates succeed
    mockEq.mockResolvedValue({ error: null });
  });

  it('returns updatedCount=0 when all items already have correct sort_order', async () => {
    mockSelectOrder.mockResolvedValue({
      data: [
        { id: 'a', sort_order: 1 },
        { id: 'b', sort_order: 2 },
        { id: 'c', sort_order: 3 },
      ],
      error: null,
    });

    const result = await runInventoryMigration();

    expect(result.updatedCount).toBe(0);
    expect(result.insertedCount).toBe(0);
    expect(mockEq).not.toHaveBeenCalled();
  });

  it('resequences all items when sort_order is completely wrong and returns correct updatedCount', async () => {
    mockSelectOrder.mockResolvedValue({
      data: [
        { id: 'a', sort_order: 5 },
        { id: 'b', sort_order: 10 },
        { id: 'c', sort_order: 15 },
      ],
      error: null,
    });

    const result = await runInventoryMigration();

    expect(result.updatedCount).toBe(3);
    expect(result.insertedCount).toBe(0);
    expect(mockEq).toHaveBeenCalledTimes(3);
  });

  it('only updates items whose sort_order differs from the 1-based index', async () => {
    mockSelectOrder.mockResolvedValue({
      data: [
        { id: 'a', sort_order: 1 },  // correct → skip
        { id: 'b', sort_order: 10 }, // should be 2 → update
        { id: 'c', sort_order: 3 },  // correct → skip
      ],
      error: null,
    });

    const result = await runInventoryMigration();

    expect(result.updatedCount).toBe(1);
    expect(result.insertedCount).toBe(0);
    expect(mockEq).toHaveBeenCalledTimes(1);
    expect(mockEq).toHaveBeenCalledWith('id', 'b');
  });

  it('returns updatedCount=0 and insertedCount=0 when DB is empty', async () => {
    mockSelectOrder.mockResolvedValue({ data: [], error: null });

    const result = await runInventoryMigration();

    expect(result).toEqual({ updatedCount: 0, insertedCount: 0 });
    expect(mockEq).not.toHaveBeenCalled();
  });

  it('throws when fetch fails', async () => {
    mockSelectOrder.mockResolvedValue({
      data: null,
      error: { message: 'connection refused', details: null },
    });

    await expect(runInventoryMigration()).rejects.toThrow();
  });

  it('throws when read-only session tries to run migration', async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      if (name === 'bb_auth_read_only') return { value: 'true' };
      return undefined;
    });

    await expect(runInventoryMigration()).rejects.toThrow();
  });
});
