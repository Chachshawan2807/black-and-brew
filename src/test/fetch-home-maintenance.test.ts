import { describe, expect, test, vi, beforeEach } from 'vitest';

const getSupabaseAccessToken = vi.fn();
const from = vi.fn();
const select = vi.fn();
const order = vi.fn();

vi.mock('@/lib/supabase-session', () => ({
  getSupabaseAccessToken,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from,
  })),
}));

vi.mock('@/lib/maintenance/filter-due-within-month', () => ({
  computeMaintenanceDueWithinMonth: vi.fn((records) =>
    records.map((record: { id: string }) => ({ id: record.id, urgency: 'within_30_days' })),
  ),
}));

describe('fetchHomeMaintenanceTasks', () => {
  beforeEach(() => {
    vi.resetModules();
    getSupabaseAccessToken.mockReset();
    from.mockReset();
    select.mockReset();
    order.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  test('uses the authenticated session token when reading service_records', async () => {
    getSupabaseAccessToken.mockResolvedValue('tok-123');
    from.mockReturnValue({ select });
    select.mockReturnValue({ order });
    order.mockResolvedValue({
      data: [{ id: 'sr-1', equipment: 'เครื่องชง', start_date: '2026-07-01' }],
      error: null,
    });

    const { fetchHomeMaintenanceTasks } = await import('@/lib/maintenance/fetch-home-maintenance');
    const tasks = await fetchHomeMaintenanceTasks('2026-07-25');

    expect(getSupabaseAccessToken).toHaveBeenCalledTimes(1);
    expect(tasks).toEqual([{ id: 'sr-1', urgency: 'within_30_days' }]);
  });
});
