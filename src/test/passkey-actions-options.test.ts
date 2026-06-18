import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateAuthenticationOptions: vi.fn(async (options: unknown) => ({
    challenge: 'auth-challenge',
    ...(options as Record<string, unknown>),
  })),
  generateRegistrationOptions: vi.fn(async (options: unknown) => ({
    challenge: 'registration-challenge',
    ...(options as Record<string, unknown>),
  })),
  getAuthSessionInfo: vi.fn(async () => ({ verified: true, readOnly: false })),
  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
}));

vi.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: mocks.generateAuthenticationOptions,
  generateRegistrationOptions: mocks.generateRegistrationOptions,
  verifyAuthenticationResponse: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
}));

vi.mock('@/app/actions/auth', () => ({
  getAuthSessionInfo: mocks.getAuthSessionInfo,
}));

vi.mock('@/app/actions/login-history-actions', () => ({
  recordLoginEvent: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/security/server-auth', () => ({
  requireServiceRoleKey: vi.fn(() => 'service-role-key'),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === 'host') return 'localhost:3000';
      if (name === 'x-forwarded-proto') return 'http';
      return null;
    },
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mocks.maybeSingle,
    })),
  })),
}));

vi.mock('@/lib/passkey/challenge-cookie', () => ({
  consumePasskeyChallenge: vi.fn(),
  storePasskeyChallenge: vi.fn(async () => undefined),
}));

vi.mock('@/lib/session-revocation', () => ({
  clearSessionRevocation: vi.fn(),
  isSessionFingerprintRevoked: vi.fn(async () => false),
}));

import {
  getPasskeyLoginOptions,
  getPasskeyRegistrationOptions,
} from '@/app/actions/passkey-actions';

const device = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  screenWidth: 1920,
  screenHeight: 1080,
  language: 'th-TH',
  timezone: 'Asia/Bangkok',
  sessionFingerprint: 'desktop-fingerprint',
};

describe('passkey server option generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  });

  test('allows registration from Windows Hello and cross-device passkeys', async () => {
    await expect(getPasskeyRegistrationOptions(device)).resolves.toMatchObject({
      success: true,
    });

    expect(mocks.generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticatorSelection: expect.objectContaining({
          residentKey: 'required',
          userVerification: 'required',
        }),
      })
    );
    expect(mocks.generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticatorSelection: expect.not.objectContaining({
          authenticatorAttachment: 'platform',
        }),
      })
    );
  });

  test('uses discoverable credentials for cross-device login', async () => {
    await expect(getPasskeyLoginOptions()).resolves.toMatchObject({
      success: true,
    });

    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [],
        userVerification: 'required',
      })
    );
  });
});
