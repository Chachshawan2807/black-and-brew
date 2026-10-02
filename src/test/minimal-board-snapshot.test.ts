import { describe, expect, test } from 'vitest';
import {
  buildMinimalSecretaryBoardSnapshot,
  secretarySnapshotDetailIsReady,
} from '@/lib/secretary/minimal-board-snapshot';

describe('secretary snapshot detail readiness', () => {
  test('a deferred home snapshot still needs its card detail', () => {
    expect(
      secretarySnapshotDetailIsReady(buildMinimalSecretaryBoardSnapshot('2026-10-02', 'th')),
    ).toBe(false);
  });

  test('a ready snapshot should not be fetched again', () => {
    const snapshot = buildMinimalSecretaryBoardSnapshot('2026-10-02', 'th');
    expect(secretarySnapshotDetailIsReady({ ...snapshot, detailStatus: 'ready' })).toBe(true);
  });
});
