import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * SEC-AUTH-001 / DEC-069 — read-only PIN sessions must NOT reach the AI chat,
 * which uses the Service Role adminClient (bypasses RLS). A read-only kiosk
 * account should never be able to interrogate the full database via the agent.
 */

const ensureServerSessionMock = vi.fn();

vi.mock('@/lib/security/server-auth', () => ({
  ensureServerSession: (...args: unknown[]) => ensureServerSessionMock(...args),
  requireServiceRoleKey: () => 'service-role-key',
}));

// Prevent real Supabase client creation at module load (database-tools + route).
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  })),
}));

import { POST } from '@/app/api/chat/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const userMessage = {
  messages: [{ role: 'user', parts: [{ type: 'text', text: 'สต็อกเหลือเท่าไหร่' }] }],
};

describe('POST /api/chat — server auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  test('returns 403 when the session is read-only', async () => {
    ensureServerSessionMock.mockResolvedValue({ ok: true, readOnly: true });

    const res = await POST(makeRequest(userMessage));

    expect(res.status).toBe(403);
  });

  test('returns 401 when the session is missing/invalid', async () => {
    ensureServerSessionMock.mockResolvedValue({ ok: false, error: 'Unauthorized' });

    const res = await POST(makeRequest(userMessage));

    expect(res.status).toBe(401);
  });
});
