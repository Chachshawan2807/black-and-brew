import { describe, expect, test } from 'vitest';
import { nextScheduledDateIso } from '@/lib/secretary/defer-tasks';

describe('secretary defer tasks', () => {
  test('nextScheduledDateIso advances one Bangkok calendar day', () => {
    expect(nextScheduledDateIso('2026-08-28')).toBe('2026-08-29');
  });
});
