import { describe, expect, test } from 'vitest';
import {
  applyWithdrawRequiredItemOrder,
  filterWithdrawRequiredItems,
  isWithdrawRequiredItem,
  parseWithdrawRequiredOrder,
} from '@/lib/inventory-withdraw-required-items';

describe('inventory withdraw required items', () => {
  test('isWithdrawRequiredItem treats exact_count and missing policy as required', () => {
    expect(isWithdrawRequiredItem({ count_policy: 'exact_count' })).toBe(true);
    expect(isWithdrawRequiredItem({ count_policy: null })).toBe(true);
    expect(isWithdrawRequiredItem({ count_policy: 'sufficiency_check' })).toBe(false);
  });

  test('filterWithdrawRequiredItems returns only required items', () => {
    const items = [
      { id: '1', name: 'ชาตรามือ', count_policy: 'exact_count' },
      { id: '2', name: 'นมโอ๊ต', count_policy: 'exact_count' },
      { id: '3', name: 'กาแฟ', count_policy: 'sufficiency_check' },
    ];

    const result = filterWithdrawRequiredItems(items);
    expect(result.map((item) => item.name).sort()).toEqual(['ชาตรามือ', 'นมโอ๊ต']);
  });

  test('applyWithdrawRequiredItemOrder sorts by saved order and appends new items', () => {
    const items = [
      { id: 'a', name: 'นมโอ๊ต', count_policy: 'exact_count' },
      { id: 'b', name: 'ชาตรามือ', count_policy: 'exact_count' },
      { id: 'c', name: 'กาแฟ', count_policy: 'sufficiency_check' },
      { id: 'd', name: 'มัทฉะ', count_policy: 'exact_count' },
    ];

    expect(applyWithdrawRequiredItemOrder(items, ['b', 'a']).map((item) => item.id)).toEqual([
      'b',
      'a',
      'd',
    ]);
  });

  test('parseWithdrawRequiredOrder reads config settings', () => {
    expect(parseWithdrawRequiredOrder({ order: ['id-1', 'id-2'] })).toEqual(['id-1', 'id-2']);
    expect(parseWithdrawRequiredOrder(null)).toEqual([]);
  });
});
