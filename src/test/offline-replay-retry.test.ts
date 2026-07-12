import { describe, expect, test } from 'vitest';
import { READ_ONLY_DENY_MSG } from '@/lib/auth-constants';
import { isOfflineReplayFailureRetryable } from '@/lib/offline-replay-retry';
import { UNAUTHORIZED_MSG } from '@/lib/policies/messages';

describe('isOfflineReplayFailureRetryable', () => {
  test('auth failures are not retryable', () => {
    expect(isOfflineReplayFailureRetryable(UNAUTHORIZED_MSG)).toBe(false);
    expect(isOfflineReplayFailureRetryable(READ_ONLY_DENY_MSG)).toBe(false);
  });

  test('validation failures are not retryable', () => {
    expect(isOfflineReplayFailureRetryable('Invalid inventory field update payload')).toBe(false);
    expect(isOfflineReplayFailureRetryable('Invalid stock update payload')).toBe(false);
  });

  test('network failures remain retryable', () => {
    expect(isOfflineReplayFailureRetryable('Failed to fetch')).toBe(true);
    expect(isOfflineReplayFailureRetryable('offline replay failed: 503')).toBe(true);
  });
});
