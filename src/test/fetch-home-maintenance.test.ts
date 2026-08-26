import { describe, expect, test, vi, beforeEach } from 'vitest';
import { pickServiceRecords } from '@/test/fixtures/service-records.fixture';

const getSupabaseAccessToken = vi.fn();
const from = vi.fn();
const select = vi.fn();
const order = vi.fn();

vi.mock('@/lib/supabase-session', () => ({
  getSupabaseAccessToken,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from },
}));

vi.mock('@/lib/maintenance/filter-due-within-week', () => ({
  computeMaintenanceDueWithinWeek: vi.fn((records) =>
    records.map((record: { id: string }) => ({ id: record.id, urgency: 'within_7_days' })),
  ),
}));

function mockServiceRecordsOk(rows: unknown[]) {
  from.mockReturnValue({ select });
  select.mockReturnValue({ order });
  order.mockResolvedValue({ data: rows, error: null });
}

describe('queryHomeMaintenanceTasks', () => {
  beforeEach(() => {
    vi.resetModules();
    from.mockReset();
    select.mockReset();
    order.mockReset();
  });

  test('reads service_records through the provided client (admin-safe for RSC)', async () => {
    const realRecord = pickServiceRecords('f680e7f0-4d97-49db-9b3b-e673bc66ea4f')[0];
    mockServiceRecordsOk([realRecord]);
    const client = { from };

    const { queryHomeMaintenanceTasks } = await import('@/lib/maintenance/fetch-home-maintenance');
    const tasks = await queryHomeMaintenanceTasks(client as never, '2026-07-25');

    expect(from).toHaveBeenCalledWith('service_records');
    expect(getSupabaseAccessToken).not.toHaveBeenCalled();
    expect(tasks).toEqual([{ id: realRecord.id, urgency: 'within_7_days' }]);
  });

  test('throws a real Error with message when Supabase returns PostgrestError-like object', async () => {
    from.mockReturnValue({ select });
    select.mockReturnValue({ order });
    order.mockResolvedValue({
      data: null,
      error: { message: 'JWT expired', details: null, code: 'PGRST301' },
    });

    const { queryHomeMaintenanceTasks } = await import('@/lib/maintenance/fetch-home-maintenance');

    await expect(queryHomeMaintenanceTasks({ from } as never, '2026-07-25')).rejects.toEqual(
      expect.objectContaining({ message: 'JWT expired' }),
    );
    await expect(queryHomeMaintenanceTasks({ from } as never, '2026-07-25')).rejects.toBeInstanceOf(
      Error,
    );
  });
});

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
    const realRecord = pickServiceRecords('f680e7f0-4d97-49db-9b3b-e673bc66ea4f')[0];
    mockServiceRecordsOk([realRecord]);

    const { fetchHomeMaintenanceTasks } = await import('@/lib/maintenance/fetch-home-maintenance');
    const tasks = await fetchHomeMaintenanceTasks('2026-07-25');

    expect(getSupabaseAccessToken).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('service_records');
    expect(tasks).toEqual([{ id: realRecord.id, urgency: 'within_7_days' }]);
  });
});
