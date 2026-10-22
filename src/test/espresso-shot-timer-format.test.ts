import { describe, expect, test } from 'vitest';
import { formatEspressoShotDuration } from '@/lib/espresso-shot-timer';

describe('espresso shot timer display', () => {
  test('shows only two whole seconds digits without tenths or minutes', () => {
    expect(formatEspressoShotDuration(0)).toBe('00');
    expect(formatEspressoShotDuration(1_600)).toBe('01');
    expect(formatEspressoShotDuration(27_999)).toBe('27');
    expect(formatEspressoShotDuration(59_999)).toBe('59');
  });
});
