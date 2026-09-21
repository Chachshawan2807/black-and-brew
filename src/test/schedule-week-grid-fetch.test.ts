import { beforeEach, describe, expect, test, vi } from 'vitest';

const { ensureSupabaseSession, from } = vi.hoisted(() => ({
  ensureSupabaseSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from },
}));

import { fetchScheduleWeekGridFromClient } from '@/lib/schedule/client-shift-queries';

function thenableQuery(result: Promise<{ data: unknown; error: unknown }>) {
  const query: Record<string, unknown> = {};
  const self = () => query;
  query.select = vi.fn(self);
  query.gte = vi.fn(self);
  query.lte = vi.fn(self);
  query.not = vi.fn(self);
  query.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    result.then(onFulfilled, onRejected);
  return query;
}

describe('fetchScheduleWeekGridFromClient', () => {
  beforeEach(() => {
    ensureSupabaseSession.mockReset();
    from.mockReset();
    ensureSupabaseSession.mockResolvedValue(true);
  });

  test('starts shifts and holidays queries before waiting for either result', async () => {
    let resolveShifts: (value: { data: unknown; error: unknown }) => void = () => {};
    let resolveHolidays: (value: { data: unknown; error: unknown }) => void = () => {};
    const shiftsResult = new Promise<{ data: unknown; error: unknown }>((resolve) => {
      resolveShifts = resolve;
    });
    const holidaysResult = new Promise<{ data: unknown; error: unknown }>((resolve) => {
      resolveHolidays = resolve;
    });

    from.mockImplementation((table: string) => {
      if (table === 'shifts') return thenableQuery(shiftsResult);
      if (table === 'holidays') return thenableQuery(holidaysResult);
      throw new Error(`unexpected table ${table}`);
    });

    const pending = fetchScheduleWeekGridFromClient('2026-08-10', '2026-08-16');
    await Promise.resolve();
    await Promise.resolve();

    expect(from.mock.calls.map((call) => call[0])).toEqual(['shifts', 'holidays']);

    resolveShifts({
      data: [
        {
          id: 'shift-1',
          employee_id: 'emp-1',
          start_time: '2026-08-12T08:00:00',
          end_time: '2026-08-12T16:00:00',
          status: 'scheduled',
          metadata: { location: '6:30' },
        },
      ],
      error: null,
    });
    resolveHolidays({
      data: [{ id: 'h-1', date: '2026-08-12', name: 'Holiday' }],
      error: null,
    });

    await expect(pending).resolves.toEqual({
      shifts: [
        {
          id: 'shift-1',
          employee_id: 'emp-1',
          start_time: '2026-08-12T00:00:00',
          end_time: '2026-08-12T23:59:59',
          status: 'scheduled',
          metadata: { location: '6:30' },
        },
      ],
      holidays: [{ id: 'h-1', date: '2026-08-12', name: 'Holiday' }],
    });
  });
});
