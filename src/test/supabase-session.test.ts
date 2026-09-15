import { beforeEach, describe, expect, test, vi } from 'vitest';

const getSession = vi.fn();
const refreshSession = vi.fn();
const signInAnonymously = vi.fn();
const signOut = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      refreshSession,
      signInAnonymously,
      signOut,
    },
  },
}));

describe('ensureSupabaseSession', () => {
  beforeEach(() => {
    vi.resetModules();
    getSession.mockReset();
    refreshSession.mockReset();
    signInAnonymously.mockReset();
    signOut.mockReset();
  });

  test('dedupes concurrent calls into a single auth round-trip', async () => {
    getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { session: null } }), 20);
        }),
    );
    signInAnonymously.mockResolvedValue({
      error: null,
      data: { session: { user: { id: 'u1' }, access_token: 'tok-new' } },
    });

    const { ensureSupabaseSession } = await import('@/lib/supabase-session');

    const [a, b, c] = await Promise.all([
      ensureSupabaseSession(),
      ensureSupabaseSession(),
      ensureSupabaseSession(),
    ]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(c).toBe(true);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  test('returns immediately when session is already ensured', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });

    const { ensureSupabaseSession } = await import('@/lib/supabase-session');

    expect(await ensureSupabaseSession()).toBe(true);
    expect(await ensureSupabaseSession()).toBe(true);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  test('clearSupabaseSession waits for in-flight ensure before signOut', async () => {
    let resolveGetSession: (value: { data: { session: null } }) => void = () => {};
    getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGetSession = resolve;
        }),
    );
    signInAnonymously.mockResolvedValue({
      error: null,
      data: { session: { user: { id: 'u1' }, access_token: 'tok-new' } },
    });
    signOut.mockResolvedValue({ error: null });

    const { ensureSupabaseSession, clearSupabaseSession } = await import('@/lib/supabase-session');

    const ensureTask = ensureSupabaseSession();
    const clearTask = clearSupabaseSession();

    resolveGetSession({ data: { session: null } });
    await ensureTask;
    await clearTask;

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  test('clearSupabaseSession resets the cache so auth runs again', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' }, access_token: 'tok-1' } } });
    signOut.mockResolvedValue({ error: null });

    const { ensureSupabaseSession, clearSupabaseSession } = await import('@/lib/supabase-session');

    expect(await ensureSupabaseSession()).toBe(true);
    await clearSupabaseSession();
    expect(await ensureSupabaseSession()).toBe(true);

    expect(getSession).toHaveBeenCalledTimes(2);
  });

  test('getSupabaseAccessToken reuses ensureSupabaseSession without a second getSession', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' }, access_token: 'tok-abc' } },
    });

    const { getSupabaseAccessToken } = await import('@/lib/supabase-session');

    const [a, b] = await Promise.all([getSupabaseAccessToken(), getSupabaseAccessToken()]);

    expect(a).toBe('tok-abc');
    expect(b).toBe('tok-abc');
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  test('getSupabaseAccessToken refreshes an expired JWT instead of returning the cached token', async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 120;
    getSession.mockResolvedValue({
      data: {
        session: { user: { id: 'u1' }, access_token: 'tok-expired', expires_at: expiredAt },
      },
    });
    refreshSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'u1' },
          access_token: 'tok-fresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });

    const { getSupabaseAccessToken } = await import('@/lib/supabase-session');

    expect(await getSupabaseAccessToken()).toBe('tok-fresh');
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  test('getSupabaseAccessToken signs in anonymously when refresh of an expired JWT fails', async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 120;
    getSession.mockResolvedValue({
      data: {
        session: { user: { id: 'u1' }, access_token: 'tok-expired', expires_at: expiredAt },
      },
    });
    refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'token is expired' },
    });
    signInAnonymously.mockResolvedValue({
      error: null,
      data: {
        session: {
          user: { id: 'u2' },
          access_token: 'tok-anon',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    const { getSupabaseAccessToken } = await import('@/lib/supabase-session');

    expect(await getSupabaseAccessToken()).toBe('tok-anon');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });
});
