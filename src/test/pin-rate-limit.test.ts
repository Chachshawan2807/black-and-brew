import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearPinAttempts,
  getPinLockoutStatus,
  recordPinFailure,
} from '@/lib/security/pin-rate-limit';

describe('pin-rate-limit', () => {
  beforeEach(() => {
    clearPinAttempts('test-ip');
  });

  it('locks out after 5 recorded failures', () => {
    expect(getPinLockoutStatus('test-ip').allowed).toBe(true);

    for (let i = 0; i < 5; i += 1) {
      recordPinFailure('test-ip');
    }

    expect(getPinLockoutStatus('test-ip').allowed).toBe(false);
  });

  it('clears failures after successful login', () => {
    recordPinFailure('test-ip');
    recordPinFailure('test-ip');
    clearPinAttempts('test-ip');
    expect(getPinLockoutStatus('test-ip').allowed).toBe(true);
  });
});
