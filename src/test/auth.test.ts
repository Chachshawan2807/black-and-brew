import { expect, test, describe, vi, beforeEach } from 'vitest';
import { verifyPin } from '@/app/actions/auth';

const mockSet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => {
    return {
      set: mockSet,
      get: vi.fn(),
      delete: vi.fn(),
    };
  })
}));

describe('verifyPin Security Checks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, APP_PIN: '1234' };
  });

  test('should delay execution to deter brute force attacks (Tarpitting)', async () => {
    const startTime = performance.now();
    await verifyPin('incorrect');
    const endTime = performance.now();
    const duration = endTime - startTime;

    // It must delay by at least 1500ms
    expect(duration).toBeGreaterThanOrEqual(1490);
  });

  test('should return correct error message on failed pin', async () => {
    const result = await verifyPin('incorrect');
    expect(result).toEqual({ success: false, error: 'รหัส PIN ไม่ถูกต้อง' });
  });

  test('should set cookies securely on success', async () => {
    (process.env as any).NODE_ENV = 'production';
    const result = await verifyPin('1234');

    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith('bb_auth_pin_verified', 'true', expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/'
    }));
  });
});
