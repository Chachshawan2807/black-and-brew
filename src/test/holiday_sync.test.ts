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

  it('returns an error when Google Calendar responds with a failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'API key rejected' } }),
    });

    const result = await fetchAndPersistHolidays('2026-07-27', '2026-08-02');

    expect(result).toEqual({ success: false, error: 'Google Calendar API error (403): API key rejected' });
  });

  it('sets a request timeout for Google Calendar', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    await fetchAndPersistHolidays('2026-07-27', '2026-08-02');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('uses Bangkok date boundaries and requests every page of holiday events', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ summary: 'วันขึ้นปีใหม่', start: { date: '2027-01-01' } }],
          nextPageToken: 'next-page',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ summary: 'วันสิ้นปี', start: { date: '2026-12-31' } }] }),
      });

    const result = await fetchAndPersistHolidays('2026-12-28', '2027-01-03');

    expect(result).toEqual({ success: true, count: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('timeMin=2026-12-27T17%3A00%3A00.000Z');
    expect(fetchMock.mock.calls[0][0]).toContain('timeMax=2027-01-03T17%3A00%3A00.000Z');
    expect(fetchMock.mock.calls[1][0]).toContain('pageToken=next-page');
    expect(mockInsert).toHaveBeenCalledWith([
      { date: '2027-01-01', name: 'วันขึ้นปีใหม่' },
      { date: '2026-12-31', name: 'วันสิ้นปี' },
    ]);
  });

  it('adds a missing New Year holiday from the Thai holiday fallback', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    const result = await fetchAndPersistHolidays('2026-12-28', '2027-01-03');

    expect(result).toEqual({ success: true, count: 2 });
    expect(mockInsert).toHaveBeenCalledWith([
      { date: '2026-12-31', name: 'วันสิ้นปี' },
      { date: '2027-01-01', name: 'วันขึ้นปีใหม่' },
    ]);
  });

  it('inserts holidays fetched from Google Calendar', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
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
      expect.any(Object),
    );
    expect(mockInsert).toHaveBeenCalledWith([
      {
        date: '2026-07-28',
        name: 'วันเฉลิมพระชนมพรรษา / วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
      },
    ]);
  });

  it('merges multiple holidays on the same date', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
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
        name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระเจ้าอยู่หัวมหาวชิราลงกรณ บดินทรเทพยวรางกูร / วันอาสาฬหบูชา / วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
      },
    ]);
  });

  it('preserves a manager-edited holiday when Google has a different name', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
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

    expect(result).toEqual({ success: true, count: 0 });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('inserts Google holidays only for dates that do not already have a row', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { summary: 'วันของ Google', start: { date: '2026-07-28' } },
          { summary: 'วันหยุดที่ขาด', start: { date: '2026-07-29' } },
        ],
      }),
    });
    mockIn.mockResolvedValue({
      data: [{ id: 'holiday-1', date: '2026-07-28', name: 'วันหยุดที่ผู้จัดการแก้' }],
      error: null,
    });

    const result = await fetchAndPersistHolidays('2026-07-27', '2026-08-02');

    expect(result).toEqual({ success: true, count: 1 });
    expect(mockInsert).toHaveBeenCalledWith([{ date: '2026-07-29', name: 'วันหยุดที่ขาด' }]);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('skips writes when holiday already matches', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
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
