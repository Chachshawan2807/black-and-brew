import { describe, expect, test } from 'vitest';
import { resolveCronInsightRecordAction } from '@/lib/insight-notification';

describe('resolveCronInsightRecordAction', () => {
  test('inserts when no existing log', () => {
    expect(resolveCronInsightRecordAction(false, undefined, false)).toBe('insert');
  });

  test('skips when morning push already dispatched (mutation path)', () => {
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

  test('scheduled cron skips only after todays scheduled push already sent (morning)', () => {
    const scheduled = {
      todayIso: '2026-08-12',
      scheduledPushDateIso: '2026-08-12',
      window: 'morning' as const,
    };
    expect(
      resolveCronInsightRecordAction(true, '2026-08-12T00:00:00.000Z', false, scheduled),
    ).toBe('skip');
  });

  test('evening cron refreshes digest even after morning push was sent', () => {
    const scheduled = {
      todayIso: '2026-08-12',
      scheduledPushDateIso: '2026-08-12',
      window: 'evening' as const,
    };
    expect(
      resolveCronInsightRecordAction(true, '2026-08-12T00:00:00.000Z', false, scheduled),
    ).toBe('update');
  });

  test('scheduled cron redispatches when summary unchanged but new calendar day', () => {
    const scheduled = {
      todayIso: '2026-08-13',
      scheduledPushDateIso: '2026-08-12',
      window: 'morning' as const,
    };
    expect(
      resolveCronInsightRecordAction(true, '2026-08-12T00:00:00.000Z', false, scheduled),
    ).toBe('update');
    expect(resolveCronInsightRecordAction(false, undefined, false, scheduled)).toBe('insert');
  });

  test('scheduled cron pushes even if bean-order mutation already notified today', () => {
    const scheduled = {
      todayIso: '2026-08-12',
      scheduledPushDateIso: undefined,
      window: 'morning' as const,
    };
    expect(
      resolveCronInsightRecordAction(true, '2026-08-12T10:00:00.000Z', false, scheduled),
    ).toBe('update');
  });
});
