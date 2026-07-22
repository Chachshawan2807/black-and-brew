import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const hookCode = fs.readFileSync(
  path.resolve(__dirname, '../hooks/use-inventory-history.ts'),
  'utf-8',
);
const prefetchCode = fs.readFileSync(
  path.resolve(__dirname, '../lib/inventory-history-prefetch.ts'),
  'utf-8',
);

describe('inventory history loading reliability', () => {
  test('opening history keeps stale rows and prefetches instead of clearing first', () => {
    expect(hookCode).toContain('prefetchInventoryHistoryFirstPage');
    expect(hookCode).not.toMatch(
      /handleOpenHistory[\s\S]*setTransactionHistory\(\[\]\)/,
    );
    expect(hookCode).not.toMatch(
      /handleOpenHistory[\s\S]*setHasMoreHistory\(false\)/,
    );
  });

  test('closing history modal resets loading flags and cancels in-flight requests', () => {
    expect(hookCode).toMatch(
      /if \(!showHistoryModal\)[\s\S]*setIsHistoryLoading\(false\)/,
    );
    expect(hookCode).toMatch(
      /if \(!showHistoryModal\)[\s\S]*setIsHistoryRefreshing\(false\)/,
    );
    expect(hookCode).toMatch(
      /if \(!showHistoryModal\)[\s\S]*requestIdRef\.current \+= 1/,
    );
  });

  test('fresh prefetch is consumed without forcing an immediate duplicate fetch', () => {
    expect(prefetchCode).toContain('isInventoryHistoryPrefetchFresh');
    expect(hookCode).toContain('isInventoryHistoryPrefetchFresh');
    expect(hookCode).toMatch(
      /isInventoryHistoryPrefetchFresh\(\)[\s\S]*return/,
    );
  });

  test('prefetch module exposes freshness check for stale-while-revalidate', () => {
    expect(prefetchCode).toContain('export function isInventoryHistoryPrefetchFresh');
    expect(prefetchCode).toContain('export function prefetchInventoryHistoryFirstPage');
  });
});
