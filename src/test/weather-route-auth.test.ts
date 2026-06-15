import { describe, expect, it, vi, beforeEach } from 'vitest';

const ensureServerSessionMock = vi.fn();

vi.mock('@/lib/security/server-auth', () => ({
  ensureServerSession: (...args: unknown[]) => ensureServerSessionMock(...args),
}));

describe('GET /api/weather auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ list: [] }),
      })
    );
  });

  it('returns 401 when session is missing', async () => {
    ensureServerSessionMock.mockResolvedValue({ ok: false, error: 'Unauthorized' });

    const { GET } = await import('@/app/api/weather/route');
    const response = await GET();

    expect(response.status).toBe(401);
  });
});
