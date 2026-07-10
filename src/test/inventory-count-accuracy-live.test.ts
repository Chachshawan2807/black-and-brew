import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyCountVerificationToAccuracyStats,
  mergeAccuracyStatsPreferringHigherChecks,
  removeCountVerificationFromAccuracyStats,
} from '@/lib/inventory-count-accuracy';

const countPage = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
  'utf-8',
);

describe('inventory count accuracy live updates', () => {
  test('each successive count accumulates discrepancy and refreshes accuracyPct', () => {
    const afterFirst = applyCountVerificationToAccuracyStats(null, {
      itemId: 'item-1',
      itemName: 'นม',
      countedQty: 10,
      systemStockQty: 10,
      matched: true,
    });
    expect(afterFirst.perItem['item-1']).toMatchObject({
      totalChecks: 1,
      matchChecks: 1,
      accuracyPct: 100,
      totalDiscrepancyQty: 0,
    });

    // Second count against updated system stock 10 → counted 8
    const afterSecond = applyCountVerificationToAccuracyStats(afterFirst, {
      itemId: 'item-1',
      itemName: 'นม',
      countedQty: 8,
      systemStockQty: 10,
      matched: false,
    });
    expect(afterSecond.perItem['item-1']).toMatchObject({
      totalChecks: 2,
      matchChecks: 1,
      totalDiscrepancyQty: 2,
      totalComparedQty: 20, // 10 + 10
      accuracyPct: 90, // 1 - 2/20
      lastCountedQty: 8,
      lastMatched: false,
    });
  });

  test('undo after two counts restores the prior aggregate', () => {
    const afterTwo = applyCountVerificationToAccuracyStats(
      applyCountVerificationToAccuracyStats(null, {
        itemId: 'item-1',
        countedQty: 10,
        systemStockQty: 10,
        matched: true,
      }),
      {
        itemId: 'item-1',
        countedQty: 8,
        systemStockQty: 10,
        matched: false,
      },
    );

    const afterUndo = removeCountVerificationFromAccuracyStats(afterTwo, {
      itemId: 'item-1',
      countedQty: 8,
      systemStockQty: 10,
      matched: false,
    });

    expect(afterUndo.perItem['item-1']).toMatchObject({
      totalChecks: 1,
      matchChecks: 1,
      totalDiscrepancyQty: 0,
      accuracyPct: 100,
    });
  });

  test('merge prefers local item stats when local has more checks than a stale fetch', () => {
    const local = applyCountVerificationToAccuracyStats(null, {
      itemId: 'item-1',
      countedQty: 9,
      systemStockQty: 10,
      matched: false,
    });
    const server = {
      perItem: {},
      overall: {
        totalChecks: 0,
        matchChecks: 0,
        accuracyPct: null,
        totalDiscrepancyQty: 0,
        totalComparedQty: 0,
      },
    };

    const merged = mergeAccuracyStatsPreferringHigherChecks(server, local);
    expect(merged.perItem['item-1']?.totalChecks).toBe(1);
    expect(merged.overall.totalChecks).toBe(1);
  });

  test('merge prefers server item stats when server already includes the new verification', () => {
    const local = applyCountVerificationToAccuracyStats(null, {
      itemId: 'item-1',
      countedQty: 9,
      systemStockQty: 10,
      matched: false,
    });
    const server = applyCountVerificationToAccuracyStats(
      applyCountVerificationToAccuracyStats(null, {
        itemId: 'item-1',
        countedQty: 10,
        systemStockQty: 10,
        matched: true,
      }),
      {
        itemId: 'item-1',
        countedQty: 9,
        systemStockQty: 10,
        matched: false,
      },
    );

    const merged = mergeAccuracyStatsPreferringHigherChecks(server, local);
    expect(merged.perItem['item-1']?.totalChecks).toBe(2);
    expect(merged.overall.totalChecks).toBe(2);
  });

  test('count page applies accuracy optimistically and merges stale accuracy fetches', () => {
    expect(countPage).toContain('isCountMatch');
    expect(countPage).toContain('applyCountVerificationToAccuracyStats');
    expect(countPage).toContain('removeCountVerificationFromAccuracyStats');
    expect(countPage).toContain('mergeAccuracyStatsPreferringHigherChecks');
    expect(countPage).toContain('accuracyTouchedRef');
    // Must not blindly overwrite local live updates with a stale fetch
    expect(countPage).not.toMatch(
      /loadAccuracyStats[\s\S]*setAccuracyStats\(res\.data\)/,
    );
  });
});
