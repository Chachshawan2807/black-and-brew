import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearPinAttempts,
  getPinLockoutStatus,
  recordPinFailure,
} from '@/lib/security/pin-rate-limit';

describe('pin-rate-limit', () => {
  beforeEach(async () => {
    await clearPinAttempts('test-ip');
  });

  it('locks out after 5 recorded failures', async () => {
    expect((await getPinLockoutStatus('test-ip')).allowed).toBe(true);

    for (let i = 0; i < 5; i += 1) {
      await recordPinFailure('test-ip');
    }

    expect((await getPinLockoutStatus('test-ip')).allowed).toBe(false);
  });

  it('clears failures after successful login', async () => {
    await recordPinFailure('test-ip');
    await recordPinFailure('test-ip');
    await clearPinAttempts('test-ip');
    expect((await getPinLockoutStatus('test-ip')).allowed).toBe(true);
  });
});
