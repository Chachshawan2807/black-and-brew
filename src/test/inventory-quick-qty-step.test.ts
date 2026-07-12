import { describe, expect, test, vi } from 'vitest';
import type { WheelEvent } from 'react';
import { blurQtyInputOnWheel, stepQuickQtyValue } from '@/lib/inventory-quick-qty-step';

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

  test('blurQtyInputOnWheel blurs the focused qty input so scroll does not change value', () => {
    const input = document.createElement('input');
    input.type = 'number';
    document.body.appendChild(input);
    input.focus();

    const blurSpy = vi.spyOn(input, 'blur');
    blurQtyInputOnWheel({ currentTarget: input } as WheelEvent<HTMLInputElement>);

    expect(blurSpy).toHaveBeenCalledTimes(1);
    input.remove();
  });
});
