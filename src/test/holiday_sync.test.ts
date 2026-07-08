import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockIn = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== 'holidays') {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select: vi.fn().mockReturnValue({
          in: mockIn,
        }),
        insert: mockInsert,
        update: mockUpdate.mockReturnValue({ eq: mockUpdateEq }),
      };
    }),
  })),
}));

import { fetchAndPersistHolidays } from '@/lib/holiday-sync';

describe('fetchAndPersistHolidays', () => {
  const originalEnv = process.env;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_CALENDAR_API_KEY: 'test-api-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    };
    global.fetch = fetchMock;
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockIn.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns error when API key is missing', async () => {
    delete process.env.GOOGLE_CALENDAR_API_KEY;

    const result = await fetchAndPersistHolidays('2026-07-27', '2026-08-02');

    expect(result).toEqual({ success: false, error: 'Missing API Key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('inserts holidays fetched from Google Calendar', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        items: [
          {
            summary: 'วันเฉลิมพระชนมพรรษา',
            start: { date: '2026-07-28' },
          },
        ],
      }),
    });

    const result = await fetchAndPersistHolidays('2026-07-27', '2026-08-02');

    expect(result).toEqual({ success: true, count: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('th.th%23holiday%40group.v.calendar.google.com'),
    );
    expect(mockInsert).toHaveBeenCalledWith([
      {
        date: '2026-07-28',
        name: 'วันเฉลิมพระชนมพรรษา',
      },
    ]);
  });

  it('merges multiple holidays on the same date', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        items: [
          {
            summary: 'วันเฉลิมพระชนมพรรษา สมเด็จพระเจ้าอยู่หัวมหาวชิราลงกรณ บดินทรเทพยวรางกูร',
            start: { date: '2026-07-28' },
          },
          {
            summary: 'วันอาสาฬหบูชา',
            start: { date: '2026-07-28' },
          },
        ],
      }),
    });

    const result = await fetchAndPersistHolidays('2026-07-27', '2026-08-02');

    expect(result).toEqual({ success: true, count: 1 });
    expect(mockInsert).toHaveBeenCalledWith([
      {
        date: '2026-07-28',
        name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระเจ้าอยู่หัวมหาวชิราลงกรณ บดินทรเทพยวรางกูร / วันอาสาฬหบูชา',
      },
    ]);
  });

  it('updates an existing holiday when merged name changes', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        items: [
          { summary: 'วันอาสาฬหบูชา', start: { date: '2026-07-28' } },
          {
            summary: 'วันเฉลิมพระชนมพรรษา สมเด็จพระเจ้าอยู่หัวมหาวชิราลงกรณ บดินทรเทพยวรางกูร',
            start: { date: '2026-07-28' },
          },
        ],
      }),
    });
    mockIn.mockResolvedValue({
      data: [{ id: 'holiday-1', date: '2026-07-28', name: 'วันอาสาฬหบูชา' }],
      error: null,
    });

    const result = await fetchAndPersistHolidays('2026-07-27', '2026-08-02');

    expect(result).toEqual({ success: true, count: 1 });
    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'วันอาสาฬหบูชา / วันเฉลิมพระชนมพรรษา สมเด็จพระเจ้าอยู่หัวมหาวชิราลงกรณ บดินทรเทพยวรางกูร',
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('skips writes when holiday already matches', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        items: [{ summary: 'วันอาสาฬหบูชา', start: { date: '2026-07-28' } }],
      }),
    });
    mockIn.mockResolvedValue({
      data: [{ id: 'holiday-1', date: '2026-07-28', name: 'วันอาสาฬหบูชา' }],
      error: null,
    });

    const result = await fetchAndPersistHolidays('2026-07-27', '2026-08-02');

    expect(result).toEqual({ success: true, count: 0 });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
