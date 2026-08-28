import { describe, expect, test } from 'vitest';
import {
  computeSessionTiming,
  formatTaskActualDurationLabel,
  sessionDurationMinutes,
} from '@/lib/secretary/task-duration';
import { nextScheduledDateIso } from '@/lib/secretary/defer-tasks';

describe('secretary task duration', () => {
  test('computeSessionTiming stores exact seconds and fractional minutes', () => {
    expect(
      computeSessionTiming('2026-08-28T08:00:00.000Z', '2026-08-28T08:00:45.000Z'),
    ).toEqual({ durationSeconds: 45, durationMinutes: 0.8 });

    expect(
      computeSessionTiming('2026-08-28T08:00:00.000Z', '2026-08-28T08:45:00.000Z'),
    ).toEqual({ durationSeconds: 2700, durationMinutes: 45 });
  });

  test('sessionDurationMinutes returns fractional minutes for short sessions', () => {
    expect(
      sessionDurationMinutes('2026-08-28T08:00:00.000Z', '2026-08-28T08:00:10.000Z'),
    ).toBe(0.2);
  });

  test('formatTaskActualDurationLabel prefers totalActualSeconds metadata', () => {
    expect(
      formatTaskActualDurationLabel({ totalActualSeconds: 125, lastActualSeconds: 60 }),
    ).toBe('ใช้เวลา 2 นาที 5 วินาที');
  });
});

describe('secretary defer tasks', () => {
  test('nextScheduledDateIso advances one Bangkok calendar day', () => {
    expect(nextScheduledDateIso('2026-08-28')).toBe('2026-08-29');
  });
});
