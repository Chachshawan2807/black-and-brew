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

  test('hook initializes visible rows from SSR/cache before modal opens', () => {
    expect(hookCode).toContain('getInitialHistoryState');
    expect(hookCode).toContain('getInitialHistoryState(options).rows');
  });

  test('history query orders by transaction_at to use DB index', () => {
    const queryCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/inventory-history-query.ts'),
      'utf-8',
    );
    expect(queryCode).toContain("HISTORY_ORDER_COLUMN = 'transaction_at'");
    expect(queryCode).toContain('.order(HISTORY_ORDER_COLUMN');
    expect(queryCode).not.toContain(".order('created_at'");
  });

  test('inventory page seeds history cache before lazy client hydrates', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/page.tsx'),
      'utf-8',
    );
    expect(pageCode).toContain('InventoryHistoryCacheSeed');
  });

  test('inventory client imports history modal statically for instant open', () => {
    const clientCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    expect(clientCode).toContain("import { InventoryHistoryModal }");
    expect(clientCode).not.toMatch(
      /const InventoryHistoryModal = dynamic\([\s\S]*InventoryHistoryModal/,
    );
  });
});
