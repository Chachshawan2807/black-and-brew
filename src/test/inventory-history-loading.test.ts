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
  test('opening history paints cache first and only clears when cache misses', () => {
    expect(hookCode).toContain('prefetchInventoryHistoryFirstPage');
    expect(hookCode).toMatch(
      /handleOpenHistory[\s\S]*applyCachedPage\('ALL'/,
    );
    expect(hookCode).toMatch(
      /handleOpenHistory[\s\S]*if \(!cached\)[\s\S]*setTransactionHistory\(\[\]\)/,
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

  test('fresh page cache skips immediate network; stale still paints from cache', () => {
    expect(prefetchCode).toContain('isHistoryPageCacheFresh');
    expect(hookCode).toContain('getHistoryPageCache');
    expect(hookCode).toContain('isHistoryPageCacheFresh');
    expect(hookCode).toMatch(
      /isHistoryPageCacheFresh\([\s\S]*return/,
    );
  });

  test('prefetch module exposes keyed page cache and warmer APIs', () => {
    expect(prefetchCode).toContain('export function getHistoryPageCache');
    expect(prefetchCode).toContain('export function prefetchInventoryHistoryFirstPage');
    expect(prefetchCode).toContain('export function warmInventoryHistoryFilterPages');
    expect(prefetchCode).toContain('export function seedInventoryHistoryCacheIfEmpty');
    expect(prefetchCode).toContain('HISTORY_PAGE_FRESH_TTL_MS');
  });

  test('hook paints cache on open/filter and warms IN/OUT/ADJUST pages', () => {
    expect(hookCode).toContain('applyCachedPage');
    expect(hookCode).toContain('warmInventoryHistoryFilterPages');
    expect(hookCode).toMatch(
      /handleHistoryTypeFilterChange[\s\S]*applyCachedPage/,
    );
    expect(hookCode).toMatch(
      /handleOpenHistory[\s\S]*warmInventoryHistoryFilterPages/,
    );
  });

  test('hook seeds SSR history and subscribes to realtime inserts while modal is open', () => {
    expect(hookCode).toContain('seedInventoryHistoryCacheIfEmpty');
    expect(hookCode).toContain('initialTransactionHistory');
    expect(hookCode).toContain('inventory_transactions');
    expect(hookCode).toContain('prependRealtimeTransaction');
  });
});
