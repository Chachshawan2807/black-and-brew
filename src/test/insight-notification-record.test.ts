import { describe, expect, test } from 'vitest';
import { resolveCronInsightRecordAction } from '@/lib/insight-notification';

describe('resolveCronInsightRecordAction', () => {
  test('inserts when no existing log', () => {
    expect(resolveCronInsightRecordAction(false, undefined, false)).toBe('insert');
  });

  test('skips when morning push already dispatched', () => {
    expect(
      resolveCronInsightRecordAction(true, '2026-08-11T00:00:00.000Z', false),
    ).toBe('skip');
  });

  test('updates existing log when morning push not yet dispatched', () => {
    expect(resolveCronInsightRecordAction(true, undefined, false)).toBe('update');
  });

  test('force replaces existing log even after morning push', () => {
    expect(
      resolveCronInsightRecordAction(true, '2026-08-11T00:00:00.000Z', true),
    ).toBe('replace');
  });
});
