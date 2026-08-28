import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockMaybeSingle, mockIn } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockIn: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
        in: mockIn,
      })),
    })),
  })),
}));

import {
  getRevokedFingerprints,
  isSessionFingerprintRevoked,
  isTransientSupabaseFetchError,
} from '@/lib/session-revocation';

describe('isSessionFingerprintRevoked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  test('returns false for empty fingerprint without querying', async () => {
    const result = await isSessionFingerprintRevoked('');
    expect(result).toBe(false);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  test('returns true when fingerprint is revoked', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { session_fingerprint: 'fp-1' },
      error: null,
    });

    expect(await isSessionFingerprintRevoked('fp-1')).toBe(true);
  });

  test('returns false when fingerprint is not revoked', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await isSessionFingerprintRevoked('fp-1')).toBe(false);
  });

  test('fails closed when Supabase returns a non-transient error', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table revoked_sessions', details: null },
    });

    expect(await isSessionFingerprintRevoked('fp-1')).toBe(true);
  });

  test('fails open on transient fetch errors', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: {
        message: 'TypeError: fetch failed',
        details:
          'TypeError: fetch failed\n\nCaused by: SocketError: other side closed (UND_ERR_SOCKET)',
      },
    });

    expect(await isSessionFingerprintRevoked('fp-1')).toBe(false);
  });

  test('fails open on transient network exceptions', async () => {
    mockMaybeSingle.mockRejectedValue(
      new Error('fetch failed', { cause: new Error('other side closed') }),
    );

    expect(await isSessionFingerprintRevoked('fp-1')).toBe(false);
  });
});

describe('isTransientSupabaseFetchError', () => {
  test('detects undici socket errors', () => {
    expect(
      isTransientSupabaseFetchError({
        message: 'TypeError: fetch failed',
        details: 'SocketError: other side closed (UND_ERR_SOCKET)',
      }),
    ).toBe(true);
  });
});

describe('getRevokedFingerprints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  test('returns empty set on query error so UI does not hide live sessions', async () => {
    mockIn.mockResolvedValue({
      data: null,
      error: { message: 'connection failed', details: null },
    });

    const result = await getRevokedFingerprints(['fp-a', 'fp-b']);
    expect(result).toEqual(new Set());
  });

  test('returns empty set on unexpected exceptions', async () => {
    mockIn.mockRejectedValue(new Error('network down'));

    const result = await getRevokedFingerprints(['fp-a']);
    expect(result).toEqual(new Set());
  });
});
