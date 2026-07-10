import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockUpsert = vi.fn();
const mockGetUser = vi.fn();
const mockCookieGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: mockCookieGet,
  })),
}));

vi.mock('@/lib/session-revocation', () => ({
  isSessionFingerprintRevoked: vi.fn().mockResolvedValue(false),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url: string, key: string, options?: { global?: { headers?: Record<string, string> } }) => {
    if (key === 'service-role-key') {
      return {
        from: vi.fn(() => ({
          upsert: mockUpsert,
        })),
      };
    }

    return {
      from: vi.fn(() => ({
        upsert: mockUpsert,
      })),
      auth: {
        getUser: mockGetUser,
      },
      _usesUserToken: options?.global?.headers?.Authorization === 'Bearer test-access-token',
    };
  }),
}));

import { createClient } from '@supabase/supabase-js';
import { registerPushSubscription } from '@/app/actions/push-actions';

describe('registerPushSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      return undefined;
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc' } },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });
  });

  test('upserts via service role after JWT validation so endpoint reclaim bypasses RLS', async () => {
    const result = await registerPushSubscription({
      accessToken: 'test-access-token',
      endpoint: 'https://push.example/sub/1',
      keys: { p256dh: 'p256', auth: 'auth' },
      prefs: {
        enabled: true,
        systemNotifications: true,
        notifyOwnChanges: false,
      },
      locale: 'th',
    });

    expect(result).toEqual({ success: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-abc',
        profile_id: null,
        endpoint: 'https://push.example/sub/1',
      }),
      { onConflict: 'endpoint' },
    );

    const calls = vi.mocked(createClient).mock.calls;
    const serviceRoleCall = calls.find(([, key]) => key === 'service-role-key');
    expect(serviceRoleCall).toBeDefined();
  });

  test('rejects when PIN session is missing', async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const result = await registerPushSubscription({
      accessToken: 'test-access-token',
      endpoint: 'https://push.example/sub/2',
      keys: { p256dh: 'p256', auth: 'auth' },
    });

    expect(result).toEqual({ success: false, error: 'pin_session_required' });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  test('rejects when Auth getUser fails — does not trust unsigned JWT payload', async () => {
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'attacker-user-id', role: 'authenticated' })
    ).toString('base64url');
    const forgedToken = `hdr.${forgedPayload}.sig`;

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid JWT', status: 401 },
    });

    const result = await registerPushSubscription({
      accessToken: forgedToken,
      endpoint: 'https://push.example/sub/forged',
      keys: { p256dh: 'p256', auth: 'auth' },
    });

    expect(result).toEqual({ success: false, error: 'supabase_session_missing' });
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
