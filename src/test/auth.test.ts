import { expect, test, describe, vi, beforeEach } from 'vitest';
import {
  verifyPin,
  assertWritableSession,
  forceRevokeDeviceSession,
} from '@/app/actions/auth';
import { AUTH_SESSION_MAX_AGE_SEC, FORCE_LOGOUT_DENY_MSG, READ_ONLY_DENY_MSG } from '@/lib/auth-constants';

const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockGet = vi.fn();

vi.mock('@/app/actions/login-history-actions', () => ({
  recordLoginEvent: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/session-revocation', () => ({
  isSessionFingerprintRevoked: vi.fn(async () => false),
  revokeSessionFingerprints: vi.fn(async () => undefined),
  clearSessionRevocation: vi.fn(async () => undefined),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  })),
}));

describe('verifyPin Security Checks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(undefined);
    process.env = { ...originalEnv, APP_PIN: '123456' };
  });

  test('should delay execution to deter brute force attacks (Tarpitting)', async () => {
    const startTime = performance.now();
    await verifyPin('incorrect');
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeGreaterThanOrEqual(1490);
  });

  test('should return correct error message on failed pin', async () => {
    const result = await verifyPin('incorrect');
    expect(result).toEqual({ success: false, error: 'รหัส PIN ไม่ถูกต้อง' });
  });

  test('should set cookies securely on full-access success', async () => {
    (process.env as any).NODE_ENV = 'production';
    const result = await verifyPin('123456', {
      userAgent: 'test',
      screenWidth: 1,
      screenHeight: 1,
      language: 'th',
      timezone: 'Asia/Bangkok',
      sessionFingerprint: 'fp-test',
    });

    expect(result).toEqual({ success: true, isReadOnly: false });
    expect(mockSet).toHaveBeenCalledWith('bb_auth_pin_verified', 'true', expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
      path: '/',
    }));
    expect(mockSet).toHaveBeenCalledWith('bb_session_fp', 'fp-test', expect.any(Object));
    expect(mockDelete).toHaveBeenCalledWith('bb_auth_read_only');
  });

  test('should set read-only cookies when PIN is 111222', async () => {
    const result = await verifyPin('111222');

    expect(result).toEqual({ success: true, isReadOnly: true });
    expect(mockSet).toHaveBeenCalledWith('bb_auth_pin_verified', 'true', expect.any(Object));
    expect(mockSet).toHaveBeenCalledWith('bb_auth_read_only', 'true', expect.any(Object));
  });
});

describe('forceRevokeDeviceSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_session_fp') return { value: 'current-fp' };
      return undefined;
    });
    process.env = { ...process.env, APP_PIN: '123456' };
  });

  test('requires master PIN', async () => {
    const result = await forceRevokeDeviceSession('111222', 'other-fp');
    expect(result).toEqual({ success: false, error: FORCE_LOGOUT_DENY_MSG });
  });

  test('rejects revoking current device', async () => {
    const result = await forceRevokeDeviceSession('123456', 'current-fp');
    expect(result.success).toBe(false);
  });

  test('revokes remote fingerprint with master PIN', async () => {
    const { revokeSessionFingerprints } = await import('@/lib/session-revocation');
    const result = await forceRevokeDeviceSession('123456', 'other-fp');
    expect(result).toEqual({ success: true });
    expect(revokeSessionFingerprints).toHaveBeenCalledWith(['other-fp'], 'forced_by_master');
  });
});

describe('assertWritableSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should reject when read-only cookie is present', async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_read_only') return { value: 'true' };
      return undefined;
    });

    const result = await assertWritableSession();
    expect(result).toEqual({ ok: false, error: READ_ONLY_DENY_MSG });
  });

  test('should allow when read-only cookie is absent', async () => {
    mockGet.mockReturnValue(undefined);

    const result = await assertWritableSession();
    expect(result).toEqual({ ok: true });
  });
});
