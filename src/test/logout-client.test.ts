import { beforeEach, describe, expect, test, vi } from 'vitest';

const clearAuthMock = vi.fn(async () => {});
const clearClientAuthSessionMock = vi.fn();
const clearSupabaseSessionMock = vi.fn(async () => {});
const clearOfflineMutationQueueMock = vi.fn(async () => {});

vi.mock('@/app/actions/auth', () => ({
  clearAuth: (...args: unknown[]) => clearAuthMock(...args),
}));

vi.mock('@/lib/client-auth-storage', () => ({
  clearClientAuthSession: () => clearClientAuthSessionMock(),
}));

vi.mock('@/lib/supabase-session', () => ({
  clearSupabaseSession: () => clearSupabaseSessionMock(),
}));

vi.mock('@/lib/offline-mutation-queue', () => ({
  clearOfflineMutationQueue: () => clearOfflineMutationQueueMock(),
}));

vi.mock('@/lib/client-device-info', () => ({
  collectClientDeviceInfo: () => ({ sessionFingerprint: 'fp-test' }),
}));

import { performClientLogout, teardownLocalAuthState } from '@/lib/logout-client';

describe('logout-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('teardownLocalAuthState clears client auth and offline mutation queue', async () => {
    await teardownLocalAuthState();

    expect(clearClientAuthSessionMock).toHaveBeenCalledTimes(1);
    expect(clearOfflineMutationQueueMock).toHaveBeenCalledTimes(1);
    expect(clearSupabaseSessionMock).toHaveBeenCalledTimes(1);
  });

  test('performClientLogout clears server auth then local teardown', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reload },
    });

    await performClientLogout();

    expect(clearAuthMock).toHaveBeenCalledTimes(1);
    expect(clearOfflineMutationQueueMock).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
