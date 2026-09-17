import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockUpsert = vi.fn();
const mockDeleteIn = vi.fn();
const mockGetUser = vi.fn();
const mockCookieGet = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEndpointMaybeSingle = vi.fn();
const mockPruneSelectData = vi.fn();

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
        from: vi.fn((table: string) => ({
          upsert: mockUpsert,
          delete: vi.fn(() => ({
            in: mockDeleteIn,
          })),
          select: vi.fn((columns: string) => {
            if (columns.includes('client_session_id')) {
              const pruneChain = {
                eq: vi.fn(() => pruneChain),
              };
              pruneChain.eq.mockImplementation((column: string) => {
                if (column === 'client_session_id') {
                  return Promise.resolve({ data: mockPruneSelectData(), error: null });
                }
                return pruneChain;
              });
              return pruneChain;
            }
            return {
              eq: vi.fn((column: string, value: string) => {
                if (column === 'endpoint') {
                  void value;
                  return { maybeSingle: mockEndpointMaybeSingle };
                }
                if (column === 'branch_id') {
                  return Promise.resolve({ data: [], error: null });
                }
                return {
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: mockMaybeSingle,
                    })),
                  })),
                };
              }),
            };
          }),
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
    delete process.env.PIN_PUSH_BINDING_USER_ID;
    mockPruneSelectData.mockReturnValue([]);
    mockDeleteIn.mockResolvedValue({ error: null });
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
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockEndpointMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  test('uses PIN_PUSH_BINDING_USER_ID when configured for PIN sessions', async () => {
    process.env.PIN_PUSH_BINDING_USER_ID = 'store-binding-user';
    const result = await registerPushSubscription({
      accessToken: 'test-access-token',
      endpoint: 'https://push.example/sub/bound',
      keys: { p256dh: 'p256', auth: 'auth' },
      clientSessionId: 'bb-session-new',
    });

    expect(result).toEqual({ success: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'store-binding-user' }),
      { onConflict: 'endpoint' },
    );
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  test('prunes duplicate endpoints for the same client session after upsert', async () => {
    mockPruneSelectData.mockReturnValue([
      {
        id: 'old-row',
        endpoint: 'https://push.example/sub/old',
        client_session_id: 'bb-session-1',
      },
      {
        id: 'keep-row',
        endpoint: 'https://push.example/sub/1',
        client_session_id: 'bb-session-1',
      },
    ]);

    await registerPushSubscription({
      accessToken: 'test-access-token',
      endpoint: 'https://push.example/sub/1',
      keys: { p256dh: 'p256', auth: 'auth' },
      clientSessionId: 'bb-session-1',
    });

    expect(mockDeleteIn).toHaveBeenCalledWith('id', ['old-row']);
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

  test('reuses prior push user_id by client_session_id when JWT is expired but PIN session is valid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'token is expired', status: 403 },
    });
    mockMaybeSingle.mockResolvedValue({
      data: { user_id: 'prior-user-id' },
      error: null,
    });

    const result = await registerPushSubscription({
      accessToken: 'expired-token',
      endpoint: 'https://fcm.googleapis.com/fcm/send/device-1',
      keys: { p256dh: 'p256', auth: 'auth' },
      clientSessionId: 'bb-session-1',
    });

    expect(result).toEqual({ success: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'prior-user-id' }),
      { onConflict: 'endpoint' },
    );
  });

  test('reuses push user_id by endpoint when JWT is expired but PIN session is valid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'token is expired', status: 403 },
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockEndpointMaybeSingle.mockResolvedValue({
      data: { user_id: 'endpoint-owner-id' },
      error: null,
    });

    const endpoint = 'https://fcm.googleapis.com/fcm/send/device-endpoint-reclaim';
    const result = await registerPushSubscription({
      accessToken: 'expired-token',
      endpoint,
      keys: { p256dh: 'p256', auth: 'auth' },
      clientSessionId: 'brand-new-session',
    });

    expect(result).toEqual({ success: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'endpoint-owner-id', endpoint }),
      { onConflict: 'endpoint' },
    );
  });

  test('rejects when Auth getUser fails does not trust unsigned JWT payload', async () => {
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
