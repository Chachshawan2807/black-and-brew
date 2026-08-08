import { describe, expect, test } from 'vitest';
import {
  formatPurchaseOrderCopyQty,
  formatPurchaseOrderListCopyText,
} from '@/lib/inventory-purchase-order-copy-text';

describe('formatPurchaseOrderListCopyText', () => {
  test('formats numbered lines with name and order quantity only', () => {
    const text = formatPurchaseOrderListCopyText([
      { name: 'ส้มนาเวล', computedOrderQty: 1 },
      { name: 'น้ำเชื่อม', computedOrderQty: 2 },
    ]);

    expect(text).toBe('1. ส้มนาเวล = 1\n2. น้ำเชื่อม = 2');
  });

  test('preserves decimal order quantities', () => {
    const text = formatPurchaseOrderListCopyText([{ name: 'นมโอ๊ต', computedOrderQty: 2.5 }]);

    expect(text).toBe('1. นมโอ๊ต = 2.5');
  });

  test('returns empty string for empty list', () => {
    expect(formatPurchaseOrderListCopyText([])).toBe('');
  });
});

describe('formatPurchaseOrderCopyQty', () => {
  test('renders integers without decimals', () => {
    expect(formatPurchaseOrderCopyQty(30)).toBe('30');
  });

  test('renders non-integers with one decimal place', () => {
    expect(formatPurchaseOrderCopyQty(1.25)).toBe('1.3');
  });
});
