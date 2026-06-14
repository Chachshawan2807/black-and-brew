import { describe, expect, test } from 'vitest';
import { stepQuickQtyValue } from '@/lib/inventory-quick-qty-step';

describe('inventory-quick-qty-step', () => {
  test('steps up from empty to 1 and down to empty at zero', () => {
    expect(stepQuickQtyValue('', 1)).toBe('1');
    expect(stepQuickQtyValue('1', -1)).toBe('');
    expect(stepQuickQtyValue('', -1)).toBe('');
  });

  test('does not go below zero', () => {
    expect(stepQuickQtyValue('3', -1)).toBe('2');
    expect(stepQuickQtyValue('0', -1)).toBe('');
  });
});
