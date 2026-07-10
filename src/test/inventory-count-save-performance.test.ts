import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  applyCountVerificationToAccuracyStats,
  removeCountVerificationFromAccuracyStats,
} from '@/lib/inventory-count-accuracy';

const countPage = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
  'utf-8',
);
const actionsCode = fs.readFileSync(
  path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
  'utf-8',
);

describe('inventory count save performance', () => {
  test('commitSave does not await onSave before returning so next-row focus is not blocked', () => {
    expect(countPage).toMatch(/void onSave\(itemId,\s*sanitized\)\.finally/);
    expect(countPage).not.toMatch(/await onSave\(itemId,\s*sanitized\)/);
  });

  test('successful count save updates accuracy locally instead of refetching all verifications', () => {
    expect(countPage).toContain('applyCountVerificationToAccuracyStats');
    expect(countPage).not.toMatch(
      /setLastVerification\([\s\S]*void loadAccuracyStats\(\)/,
    );
  });

  test('count save defers audit log and path revalidation off the critical response path', () => {
    expect(actionsCode).toContain("import { after } from 'next/server'");
    const fnStart = actionsCode.indexOf('export async function recordInventoryCountAndUpdateStock');
    const fnEnd = actionsCode.indexOf('// === FETCH COUNT ACCURACY STATS ===', fnStart);
    const fnBody = actionsCode.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
    const afterIdx = fnBody.indexOf('after(async () => {');
    expect(afterIdx).toBeGreaterThan(-1);
    const criticalPath = fnBody.slice(0, afterIdx);
    expect(criticalPath).not.toContain('recordDataChange');
    expect(criticalPath).not.toContain('revalidatePath');
    expect(fnBody.slice(afterIdx)).toContain('recordDataChange');
    expect(fnBody.slice(afterIdx)).toContain('revalidatePath');
  });

  test('applyCountVerificationToAccuracyStats increments per-item and overall totals', () => {
    const next = applyCountVerificationToAccuracyStats(null, {
      itemId: 'item-1',
      itemName: 'นม',
      countedQty: 9,
      systemStockQty: 10,
      matched: false,
      countedAt: '2026-07-10T00:00:00.000Z',
    });

    expect(next.perItem['item-1']).toMatchObject({
      itemName: 'นม',
      totalChecks: 1,
      matchChecks: 0,
      totalDiscrepancyQty: 1,
      totalComparedQty: 10,
      lastCountedQty: 9,
      lastSystemStockQty: 10,
      lastMatched: false,
      accuracyPct: 90,
    });
    expect(next.overall).toMatchObject({
      totalChecks: 1,
      matchChecks: 0,
      totalDiscrepancyQty: 1,
      totalComparedQty: 10,
      accuracyPct: 90,
    });
  });

  test('removeCountVerificationFromAccuracyStats reverses one verification', () => {
    const withOne = applyCountVerificationToAccuracyStats(null, {
      itemId: 'item-1',
      itemName: 'นม',
      countedQty: 9,
      systemStockQty: 10,
      matched: false,
      countedAt: '2026-07-10T00:00:00.000Z',
    });

    const cleared = removeCountVerificationFromAccuracyStats(withOne, {
      itemId: 'item-1',
      countedQty: 9,
      systemStockQty: 10,
      matched: false,
    });

    expect(cleared.perItem['item-1']).toBeUndefined();
    expect(cleared.overall).toMatchObject({
      totalChecks: 0,
      matchChecks: 0,
      totalDiscrepancyQty: 0,
      totalComparedQty: 0,
      accuracyPct: null,
    });
  });
});
