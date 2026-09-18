import { describe, expect, test } from 'vitest';
import { resolveScheduleBoardGridClass } from '@/lib/secretary/schedule-board-grid-class';

describe('resolveScheduleBoardGridClass', () => {
  test('uses two columns on mobile for multiple schedule days', () => {
    expect(resolveScheduleBoardGridClass(4)).toMatch(/grid-cols-2/);
  });

  test('single day uses compact single column', () => {
    expect(resolveScheduleBoardGridClass(1)).toContain('grid-cols-1');
  });
});
