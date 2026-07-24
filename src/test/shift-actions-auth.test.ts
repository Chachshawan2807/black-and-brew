import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGet, mockFrom } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  return {
    mockGet: vi.fn(),
    mockFrom: vi.fn(),
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

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      }),
    },
    from: mockFrom,
  })),
}));

const { fetchRosterData, revalidateAppPaths } = await import('@/app/actions/shift-actions');

describe('shift server actions auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockGet.mockReturnValue(undefined);
  });

  test('fetchRosterData rejects unauthenticated callers', async () => {
    const result = await fetchRosterData('2026-07-01', '2026-07-07');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('revalidateAppPaths rejects unauthenticated callers', async () => {
    const result = await revalidateAppPaths();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });
});
