import { describe, expect, test } from 'vitest';
import { Children, createElement } from 'react';
import {
  BB_SELECT_LIST_CLASS,
  BB_SELECT_OPTION_CLASS,
  parseSelectOptions,
} from '@/components/ui/select-trigger-styles';

describe('rounded select custom listbox options', () => {
  test('list and option tokens use theme surfaces and rounded corners', () => {
    expect(BB_SELECT_LIST_CLASS).toMatch(/\brounded-2xl\b/);
    expect(BB_SELECT_LIST_CLASS).toMatch(/\bbg-card\b/);
    expect(BB_SELECT_LIST_CLASS).toMatch(/\btext-foreground\b/);
    expect(BB_SELECT_LIST_CLASS).toMatch(/\bborder-border\b/);

    expect(BB_SELECT_OPTION_CLASS).toMatch(/\brounded-xl\b/);
    expect(BB_SELECT_OPTION_CLASS).toMatch(/\btext-foreground\b/);
    expect(BB_SELECT_OPTION_CLASS).not.toMatch(/bg-blue|#0000ff|rgb\(0,\s*0,\s*255\)/i);
  });

  test('parseSelectOptions reads native option children', () => {
    const children = [
      createElement('option', { key: 'a', value: 'all' }, 'ทั้งหมด'),
      createElement('option', { key: 'b', value: 'paid', disabled: true }, 'ชำระแล้ว'),
    ];
    expect(parseSelectOptions(Children.toArray(children))).toEqual([
      { value: 'all', label: 'ทั้งหมด', disabled: false },
      { value: 'paid', label: 'ชำระแล้ว', disabled: true },
    ]);
  });
});
