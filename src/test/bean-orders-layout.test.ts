import { describe, expect, test } from 'vitest';
import {
  BEAN_ORDER_CARD,
  BEAN_ORDER_LIST_CARD,
  BEAN_ORDER_LIST_GRID,
  BEAN_ORDER_LIST_HEADER,
  BEAN_ORDER_LIST_ROW,
} from '@/app/[locale]/bean-orders/_components/bean-order-layout';

describe('BEAN_ORDER_LIST_GRID', () => {
  test('uses flexible columns that fill available width on desktop', () => {
    expect(BEAN_ORDER_LIST_GRID).toContain('minmax(0,1.2fr)');
    expect(BEAN_ORDER_LIST_GRID).toContain('minmax(12rem,1.3fr)');
    expect(BEAN_ORDER_LIST_GRID).not.toContain('max-content');
    expect(BEAN_ORDER_LIST_GRID).not.toContain('9.5rem');
  });
});

describe('BEAN_ORDER_CARD', () => {
  test('allows autocomplete dropdowns to extend outside the card', () => {
    expect(BEAN_ORDER_CARD).toContain('overflow-visible');
    expect(BEAN_ORDER_CARD).not.toContain('overflow-hidden');
  });
});

describe('bean order list borders', () => {
  test('keeps list card flat and avoids nested row shadows that stack with borders', () => {
    expect(BEAN_ORDER_LIST_CARD).not.toContain('bb-shadow');
    expect(BEAN_ORDER_LIST_HEADER).not.toMatch(/bb-shadow/);
    expect(BEAN_ORDER_LIST_ROW).not.toContain('bb-shadow-sm');
    expect(BEAN_ORDER_LIST_ROW).not.toContain('lg:border-b');
  });
});
