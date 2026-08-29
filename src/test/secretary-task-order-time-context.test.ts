import { describe, expect, test } from 'vitest';
import {
  buildSecretaryTimeContext,
  resolveSecretaryWorkdayPhase,
} from '@/lib/secretary/task-order-time-context';

describe('secretary task order time context', () => {
  test('classifies before open, open hours, and near close', () => {
    expect(resolveSecretaryWorkdayPhase(new Date('2026-08-29T06:00:00+07:00'))).toBe('before_open');
    expect(resolveSecretaryWorkdayPhase(new Date('2026-08-29T10:00:00+07:00'))).toBe('open_hours');
    expect(resolveSecretaryWorkdayPhase(new Date('2026-08-29T19:30:00+07:00'))).toBe('near_close');
  });

  test('buildSecretaryTimeContext includes Bangkok time', () => {
    const context = buildSecretaryTimeContext(new Date('2026-08-29T10:15:00+07:00'));
    expect(context.bangkokTime).toContain('2026-08-29');
    expect(context.phase).toBe('open_hours');
  });
});
