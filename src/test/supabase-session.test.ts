import { beforeEach, describe, expect, test, vi } from 'vitest';

const getSession = vi.fn();
const signInAnonymously = vi.fn();
const signOut = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      signInAnonymously,
      signOut,
    },
  },
}));

describe('ensureSupabaseSession', () => {
  beforeEach(() => {
    vi.resetModules();
    getSession.mockReset();
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
    signInAnonymously.mockResolvedValue({ error: null });

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

  test('clearSupabaseSession resets the cache so auth runs again', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    signOut.mockResolvedValue({ error: null });

    const { ensureSupabaseSession, clearSupabaseSession } = await import('@/lib/supabase-session');

    expect(await ensureSupabaseSession()).toBe(true);
    await clearSupabaseSession();
    expect(await ensureSupabaseSession()).toBe(true);

    expect(getSession).toHaveBeenCalledTimes(2);
  });
});
