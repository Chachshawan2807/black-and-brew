import { describe, expect, it } from 'vitest';
import { getQuickBadgeStyles, getStockColorClass } from '@/lib/inventory-stock';

describe('getStockColorClass', () => {
  it('is green when stock is greater than order point', () => {
    expect(getStockColorClass(10, 5)).toBe('text-green-600');
    expect(getStockColorClass(6, 5)).toBe('text-green-600');
  });

  it('is red when stock is less than or equal to order point', () => {
    expect(getStockColorClass(5, 5)).toBe('text-red-600');
    expect(getStockColorClass(3, 5)).toBe('text-red-600');
    expect(getStockColorClass(0, 0)).toBe('text-red-600');
  });
});

describe('getQuickBadgeStyles', () => {
  it('uses emerald badge when stock is above order point', () => {
    const styles = getQuickBadgeStyles(10, 5);
    expect(styles.bg).toContain('emerald');
    expect(styles.val).toContain('emerald');
  });

  it('uses red badge when stock is at or below order point', () => {
    const styles = getQuickBadgeStyles(5, 5);
    expect(styles.bg).toContain('red');
    expect(styles.val).toContain('red');
  });
});
