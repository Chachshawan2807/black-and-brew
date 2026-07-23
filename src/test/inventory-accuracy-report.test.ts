import { describe, expect, test } from 'vitest';
import {
  sortHighDiscrepancyItems,
  type HighDiscrepancyItem,
} from '@/lib/inventory-accuracy-report';

const sampleItems: HighDiscrepancyItem[] = [
  {
    itemId: 'a',
    itemName: 'กาแฟ',
    totalDiscrepancyQty: 12,
    accuracyPct: 70,
    totalChecks: 3,
    matchChecks: 1,
    totalComparedQty: 40,
    lastSystemStockQty: 20,
    lastCountedQty: 8,
    lastCountedAt: null,
    lastMatched: false,
  },
  {
    itemId: 'b',
    itemName: 'นม',
    totalDiscrepancyQty: 5,
    accuracyPct: 90,
    totalChecks: 2,
    matchChecks: 1,
    totalComparedQty: 50,
    lastSystemStockQty: 25,
    lastCountedQty: 20,
    lastCountedAt: null,
    lastMatched: false,
  },
  {
    itemId: 'c',
    itemName: 'น้ำตาล',
    totalDiscrepancyQty: 5,
    accuracyPct: 60,
    totalChecks: 2,
    matchChecks: 0,
    totalComparedQty: 12,
    lastSystemStockQty: 10,
    lastCountedQty: 4,
    lastCountedAt: null,
    lastMatched: false,
  },
];

describe('sortHighDiscrepancyItems', () => {
  test('sorts by discrepancy descending by default', () => {
    const sorted = sortHighDiscrepancyItems(sampleItems, {
      sortBy: 'discrepancy',
      sortOrder: 'desc',
    });
    expect(sorted.map((item) => item.itemId)).toEqual(['a', 'b', 'c']);
  });

  test('sorts by discrepancy ascending', () => {
    const sorted = sortHighDiscrepancyItems(sampleItems, {
      sortBy: 'discrepancy',
      sortOrder: 'asc',
    });
    expect(sorted.map((item) => item.itemId)).toEqual(['c', 'b', 'a']);
  });

  test('sorts by accuracy descending', () => {
    const sorted = sortHighDiscrepancyItems(sampleItems, {
      sortBy: 'accuracy',
      sortOrder: 'desc',
    });
    expect(sorted.map((item) => item.itemId)).toEqual(['b', 'a', 'c']);
  });

  test('sorts by accuracy ascending', () => {
    const sorted = sortHighDiscrepancyItems(sampleItems, {
      sortBy: 'accuracy',
      sortOrder: 'asc',
    });
    expect(sorted.map((item) => item.itemId)).toEqual(['c', 'a', 'b']);
  });

  test('does not mutate the input array', () => {
    const copy = [...sampleItems];
    sortHighDiscrepancyItems(sampleItems, { sortBy: 'accuracy', sortOrder: 'asc' });
    expect(sampleItems).toEqual(copy);
  });
});
