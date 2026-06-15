import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGet, mockDelete, isSessionFingerprintRevoked } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockDelete: vi.fn(),
  isSessionFingerprintRevoked: vi.fn(async () => false),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: mockGet,
    set: vi.fn(),
    delete: mockDelete,
  })),
}));

vi.mock('@/lib/session-revocation', () => ({
  isSessionFingerprintRevoked,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      }),
    },
  })),
}));

import { ensureServerSession } from '@/lib/security/server-auth';
import { recordTransaction } from '@/app/actions/inventory-actions';

describe('ensureServerSession revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    isSessionFingerprintRevoked.mockResolvedValue(false);
  });

  test('rejects revoked PIN fingerprint and clears auth cookies', async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      if (name === 'bb_session_fp') return { value: 'revoked-fp' };
      return undefined;
    });
    isSessionFingerprintRevoked.mockResolvedValue(true);

    const result = await ensureServerSession();

    expect(result).toEqual({
      ok: false,
      error: 'Unauthorized: Session missing or invalid',
    });
    expect(isSessionFingerprintRevoked).toHaveBeenCalledWith('revoked-fp');
    expect(mockDelete).toHaveBeenCalledWith('bb_auth_pin_verified');
    expect(mockDelete).toHaveBeenCalledWith('bb_auth_read_only');
    expect(mockDelete).toHaveBeenCalledWith('bb_session_fp');
  });

  test('allows active PIN fingerprint', async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      if (name === 'bb_session_fp') return { value: 'active-fp' };
      if (name === 'bb_auth_read_only') return { value: 'true' };
      return undefined;
    });

    const result = await ensureServerSession();

    expect(result).toEqual({ ok: true, readOnly: true });
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('mutation server actions honor revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    isSessionFingerprintRevoked.mockResolvedValue(true);
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      if (name === 'bb_session_fp') return { value: 'revoked-fp' };
      return undefined;
    });
  });

  test('recordTransaction rejects revoked PIN session', async () => {
    const result = await recordTransaction('item-1', 'IN', 1, 'test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });
});
