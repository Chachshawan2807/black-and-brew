import { describe, expect, test } from 'vitest';
import { BEAN_ORDER_LIST_GRID } from '@/app/[locale]/bean-orders/_components/bean-order-layout';

describe('BEAN_ORDER_LIST_GRID', () => {
  test('uses flexible columns that fill available width on desktop', () => {
    expect(BEAN_ORDER_LIST_GRID).toContain('minmax(0,1.2fr)');
    expect(BEAN_ORDER_LIST_GRID).toContain('minmax(12rem,1.3fr)');
    expect(BEAN_ORDER_LIST_GRID).not.toContain('max-content');
    expect(BEAN_ORDER_LIST_GRID).not.toContain('9.5rem');
  });
});
