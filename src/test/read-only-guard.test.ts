import { expect, test, describe, vi, beforeEach } from 'vitest';
import { recordTransaction } from '@/app/actions/inventory-actions';
import { READ_ONLY_DENY_MSG } from '@/lib/auth-constants';

const mockGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: mockGet,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

describe('read-only server action guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  test('recordTransaction rejects read-only session', async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      if (name === 'bb_auth_read_only') return { value: 'true' };
      return undefined;
    });

    const result = await recordTransaction('item-1', 'IN', 1, 'test');
    expect(result.success).toBe(false);
    expect(result.error).toBe(READ_ONLY_DENY_MSG);
  });
});
