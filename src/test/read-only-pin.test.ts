import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('resolveReadOnlyPin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses APP_READ_ONLY_PIN when configured', async () => {
    process.env.APP_READ_ONLY_PIN = '654321';
    const { resolveReadOnlyPin } = await import('@/lib/security/read-only-pin');
    expect(resolveReadOnlyPin()).toBe('654321');
  });

  it('returns null in production when unset', async () => {
    delete process.env.APP_READ_ONLY_PIN;
    vi.stubEnv('NODE_ENV', 'production');
    const { resolveReadOnlyPin } = await import('@/lib/security/read-only-pin');
    expect(resolveReadOnlyPin()).toBeNull();
  });

  it('falls back to dev default when unset in development', async () => {
    delete process.env.APP_READ_ONLY_PIN;
    vi.stubEnv('NODE_ENV', 'development');
    const { resolveReadOnlyPin } = await import('@/lib/security/read-only-pin');
    expect(resolveReadOnlyPin()).toBe('111222');
  });
});
