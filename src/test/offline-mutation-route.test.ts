import { beforeEach, describe, expect, test, vi } from 'vitest';

const cookiesGetMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({
    get: cookiesGetMock,
  })),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

const requireMutationAccessMock = vi.fn();
const replayOfflineMutationMock = vi.fn();

vi.mock('@/lib/policies/server-gate', () => ({
  requireMutationAccess: (...args: unknown[]) => requireMutationAccessMock(...args),
}));

vi.mock('@/lib/offline-mutation-sync', () => ({
  replayOfflineMutation: (...args: unknown[]) => replayOfflineMutationMock(...args),
}));

import { POST } from '@/app/api/inventory/offline-mutation/route';
import { READ_ONLY_DENY_MSG } from '@/lib/auth-constants';
import { UNAUTHORIZED_MSG } from '@/lib/policies/messages';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/inventory/offline-mutation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fieldMutation = {
  id: '1',
  createdAt: Date.now(),
  kind: 'inventory_field',
  itemId: '550e8400-e29b-41d4-a716-446655440000',
  field: 'name',
  value: 'Milk',
  authSessionId: 'auth-a',
};

describe('POST /api/inventory/offline-mutation — auth gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    replayOfflineMutationMock.mockResolvedValue({ success: true });
    cookiesGetMock.mockImplementation((name: string) => {
      if (name === 'bb_offline_auth_sid') return { value: 'auth-a' };
      return undefined;
    });
  });

  test('returns 401 when mutation access is denied (unauthorized)', async () => {
    requireMutationAccessMock.mockResolvedValue(UNAUTHORIZED_MSG);

    const res = await POST(makeRequest(fieldMutation));

    expect(res.status).toBe(401);
    expect(replayOfflineMutationMock).not.toHaveBeenCalled();
  });

  test('returns 403 when session is read-only', async () => {
    requireMutationAccessMock.mockResolvedValue(READ_ONLY_DENY_MSG);

    const res = await POST(makeRequest(fieldMutation));

    expect(res.status).toBe(403);
    expect(replayOfflineMutationMock).not.toHaveBeenCalled();
  });

  test('replays mutation when access is granted', async () => {
    requireMutationAccessMock.mockResolvedValue(null);

    const res = await POST(makeRequest(fieldMutation));

    expect(res.status).toBe(200);
    expect(replayOfflineMutationMock).toHaveBeenCalledWith(fieldMutation);
  });

  test('returns 403 when offline mutation auth session mismatches cookie', async () => {
    requireMutationAccessMock.mockResolvedValue(null);
    cookiesGetMock.mockImplementation((name: string) => {
      if (name === 'bb_offline_auth_sid') return { value: 'auth-b' };
      return undefined;
    });

    const res = await POST(makeRequest(fieldMutation));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.retryable).toBe(false);
    expect(replayOfflineMutationMock).not.toHaveBeenCalled();
  });

  test('returns 403 for legacy mutations without authSessionId', async () => {
    requireMutationAccessMock.mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        ...fieldMutation,
        authSessionId: undefined,
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.retryable).toBe(false);
    expect(replayOfflineMutationMock).not.toHaveBeenCalled();
  });
});
