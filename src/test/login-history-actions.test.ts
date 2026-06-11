import { describe, expect, test, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: mockGet,
  })),
  headers: vi.fn().mockImplementation(async () => ({
    get: (name: string) => {
      if (name === 'x-forwarded-for') return '203.0.113.10, 10.0.0.1';
      return null;
    },
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
    })),
  })),
}));

import { recordLoginEvent, fetchLoginHistory } from '@/app/actions/login-history-actions';

const sampleDevice = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  screenWidth: 390,
  screenHeight: 844,
  language: 'th-TH',
  timezone: 'Asia/Bangkok',
  sessionFingerprint: 'iphone-test-fp',
};

describe('recordLoginEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockInsert.mockResolvedValue({ error: null });
  });

  test('inserts login_success with parsed device fields and client IP', async () => {
    await recordLoginEvent({
      eventType: 'login_success',
      status: 'success',
      device: sampleDevice,
      accessLevel: 'full',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'login_success',
        status: 'success',
        access_level: 'full',
        ip_address: '203.0.113.10',
        device_type: 'mobile',
        device_vendor: 'Apple',
        device_model: 'iPhone',
        os_name: 'iOS',
        browser_name: 'Safari',
        session_fingerprint: 'iphone-test-fp',
      })
    );
  });
});

describe('fetchLoginHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockGet.mockReturnValue({ value: 'true' });
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ order: mockOrder });
  });

  test('rejects unauthenticated requests', async () => {
    mockGet.mockReturnValue(undefined);

    const result = await fetchLoginHistory();

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test('returns rows for authenticated session', async () => {
    const rows = [
      {
        id: '1',
        event_type: 'login_success',
        occurred_at: '2026-06-11T10:00:00.000Z',
        ip_address: '203.0.113.10',
        device_type: 'mobile',
        device_vendor: 'Apple',
        device_model: 'iPhone',
        os_name: 'iOS',
        os_version: '17.4',
        browser_name: 'Safari',
        browser_version: '17.4',
        access_level: 'full',
        status: 'success',
        failure_reason: null,
        session_fingerprint: 'fp',
        metadata: {},
      },
    ];
    mockLimit.mockResolvedValue({ data: rows, error: null });

    const result = await fetchLoginHistory(10);

    expect(result).toEqual({ success: true, rows });
    expect(mockOrder).toHaveBeenCalledWith('occurred_at', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(10);
  });
});
