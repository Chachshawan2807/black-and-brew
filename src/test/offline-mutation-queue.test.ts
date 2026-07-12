import { describe, expect, test } from 'vitest';
import {
  isOfflineRetryableError,
  isOfflineRetryableResult,
  mergeOfflineFieldMutation,
  OFFLINE_MUTATION_SYNC_TAG,
} from '@/lib/offline-mutation-types';
import { UNAUTHORIZED_MSG } from '@/lib/policies/messages';

describe('offline-mutation-types', () => {
  test('isOfflineRetryableError detects offline and network failures', () => {
    expect(isOfflineRetryableError(new Error('Failed to fetch'), true)).toBe(true);
    expect(isOfflineRetryableError(new Error('permission denied'), true)).toBe(false);
    expect(isOfflineRetryableError(new Error('anything'), false)).toBe(true);
  });

  test('isOfflineRetryableResult respects explicit retryable flag', () => {
    expect(
      isOfflineRetryableResult({ success: false, error: UNAUTHORIZED_MSG, retryable: false }, true),
    ).toBe(false);
    expect(
      isOfflineRetryableResult({ success: false, error: 'Failed to fetch', retryable: true }, true),
    ).toBe(true);
  });

  test('mergeOfflineFieldMutation coalesces duplicate field updates per item', () => {
    const existing = {
      id: 'm1',
      createdAt: 1,
      kind: 'inventory_field' as const,
      itemId: 'a',
      field: 'name',
      value: 'old',
    };
    const incoming = {
      id: 'm2',
      createdAt: 2,
      kind: 'inventory_field' as const,
      itemId: 'a',
      field: 'name',
      value: 'new',
    };
    expect(mergeOfflineFieldMutation(existing, incoming)).toEqual({
      ...incoming,
      id: 'm1',
      createdAt: 1,
    });
  });

  test('uses stable background sync tag', () => {
    expect(OFFLINE_MUTATION_SYNC_TAG).toBe('bb-offline-mutations');
  });
});
