import { describe, expect, test } from 'vitest';
import {
  applyItemTodayCount,
  attachLatestInventoryCountTimes,
  buildLatestCountedAtByItemId,
  buildTodayCountStatusFromLogs,
  buildTodayCountStatusFromVerifications,
  extractStockQtyFromCountLog,
  formatInventoryCountTime,
  getBangkokTodayUtcBounds,
  removeItemTodayCount,
  shouldContinueLatestCountScan,
  type TodayCountSessionStatus,
} from '@/lib/inventory-count-today';

const TODAY_ISO = '2026-07-23T08:30:00.000Z';

describe('inventory count today status', () => {
  test('extractStockQtyFromCountLog reads stock field changes', () => {
    expect(
      extractStockQtyFromCountLog({
        entity_id: 'item-1',
        occurred_at: TODAY_ISO,
        field_changes: [{ field: 'stock', old_value: 4, new_value: 7 }],
      }),
    ).toEqual({ countedQty: 7, systemStockQty: 4 });
  });

  test('extractStockQtyFromCountLog ignores non-finite stock values', () => {
    expect(
      extractStockQtyFromCountLog({
        entity_id: 'item-1',
        occurred_at: TODAY_ISO,
        field_changes: [{ field: 'stock', old_value: 4, new_value: 'Infinity' }],
      }),
    ).toEqual({ countedQty: null, systemStockQty: 4 });
  });

  test('buildTodayCountStatusFromVerifications keeps latest row per item including matching stock', () => {
    const status = buildTodayCountStatusFromVerifications(
      [
        {
          inventory_item_id: 'item-1',
          counted_at: '2026-07-23T02:00:00.000Z',
          counted_qty: 5,
          system_stock_qty: 5,
        },
        {
          inventory_item_id: 'item-2',
          counted_at: '2026-07-23T03:00:00.000Z',
          counted_qty: 3,
          system_stock_qty: 7,
        },
        {
          inventory_item_id: 'item-1',
          counted_at: '2026-07-23T01:00:00.000Z',
          counted_qty: 1,
          system_stock_qty: 0,
        },
      ],
      3,
      new Date('2026-07-23T12:00:00.000Z'),
    );

    expect(status.perItem['item-1']).toEqual({
      countedAt: '2026-07-23T02:00:00.000Z',
      countedQty: 5,
      systemStockQty: 5,
    });
    expect(status.session.countedTodayCount).toBe(2);
    expect(status.session.hasCountedToday).toBe(true);
    expect(status.session.isFullyCountedToday).toBe(false);
    expect(status.session.firstCountedAt).toBe('2026-07-23T02:00:00.000Z');
    expect(status.session.lastCountedAt).toBe('2026-07-23T03:00:00.000Z');
  });

  test('buildTodayCountStatusFromLogs keeps latest row per item and session summary', () => {
    const status = buildTodayCountStatusFromLogs(
      [
        {
          entity_id: 'item-1',
          occurred_at: '2026-07-23T02:00:00.000Z',
          field_changes: [{ field: 'stock', old_value: 1, new_value: 2 }],
        },
        {
          entity_id: 'item-2',
          occurred_at: '2026-07-23T03:00:00.000Z',
          field_changes: [{ field: 'stock', old_value: 5, new_value: 5 }],
        },
        {
          entity_id: 'item-1',
          occurred_at: '2026-07-23T01:00:00.000Z',
          field_changes: [{ field: 'stock', old_value: 0, new_value: 1 }],
        },
      ],
      3,
      new Date('2026-07-23T12:00:00.000Z'),
    );

    expect(status.perItem['item-1']).toEqual({
      countedAt: '2026-07-23T02:00:00.000Z',
      countedQty: 2,
      systemStockQty: 1,
    });
    expect(status.session.countedTodayCount).toBe(2);
    expect(status.session.hasCountedToday).toBe(true);
    expect(status.session.isFullyCountedToday).toBe(false);
    expect(status.session.firstCountedAt).toBe('2026-07-23T02:00:00.000Z');
    expect(status.session.lastCountedAt).toBe('2026-07-23T03:00:00.000Z');
  });

  test('applyItemTodayCount and removeItemTodayCount update session totals', () => {
    const empty: TodayCountSessionStatus = {
      perItem: {},
      session: {
        totalItems: 2,
        countedTodayCount: 0,
        firstCountedAt: null,
        lastCountedAt: null,
        hasCountedToday: false,
        isFullyCountedToday: false,
      },
    };

    const afterSave = applyItemTodayCount(empty, 'item-1', 8, 6, TODAY_ISO);
    expect(afterSave.session.countedTodayCount).toBe(1);
    expect(afterSave.session.hasCountedToday).toBe(true);

    const afterUndo = removeItemTodayCount(afterSave, 'item-1');
    expect(afterUndo.session.countedTodayCount).toBe(0);
    expect(afterUndo.session.hasCountedToday).toBe(false);
  });

  test('getBangkokTodayUtcBounds returns start/end for Bangkok day', () => {
    const bounds = getBangkokTodayUtcBounds(new Date('2026-07-23T12:00:00.000Z'));
    expect(bounds.startUtc < bounds.endUtc).toBe(true);
    expect(bounds.startUtc).toContain('T');
  });

  test('formatInventoryCountTime renders Thai clock label', () => {
    expect(formatInventoryCountTime('2026-07-23T08:30:00.000Z')).toMatch(/น\.$/);
  });

  test('buildLatestCountedAtByItemId keeps newest counted_at per item', () => {
    expect(
      buildLatestCountedAtByItemId([
        { inventory_item_id: 'a', counted_at: '2026-09-18T00:10:00.000Z' },
        { inventory_item_id: 'b', counted_at: '2026-09-18T00:05:00.000Z' },
        { inventory_item_id: 'a', counted_at: '2026-09-14T00:00:00.000Z' },
      ]),
    ).toEqual({
      a: '2026-09-18T00:10:00.000Z',
      b: '2026-09-18T00:05:00.000Z',
    });
  });

  test('attachLatestInventoryCountTimes merges last_counted_at onto inventory rows', () => {
    const items = attachLatestInventoryCountTimes(
      [{ id: 'a', name: 'Milk' }, { id: 'b', name: 'Sugar' }],
      { a: '2026-09-18T00:10:00.000Z' },
    );
    expect(items[0].last_counted_at).toBe('2026-09-18T00:10:00.000Z');
    expect(items[1].last_counted_at).toBeNull();
  });

  test('shouldContinueLatestCountScan pages until known items are filled or the last page', () => {
    const seen = new Set(['a']);
    expect(
      shouldContinueLatestCountScan({
        pageLength: 1000,
        pageSize: 1000,
        rowsScanned: 1000,
        maxRows: 50000,
        knownItemIds: ['a', 'b'],
        seenItemIds: seen,
      }),
    ).toBe(true);
    expect(
      shouldContinueLatestCountScan({
        pageLength: 1000,
        pageSize: 1000,
        rowsScanned: 2000,
        maxRows: 50000,
        knownItemIds: ['a', 'b'],
        seenItemIds: new Set(['a', 'b']),
      }),
    ).toBe(false);
    expect(
      shouldContinueLatestCountScan({
        pageLength: 12,
        pageSize: 1000,
        rowsScanned: 1012,
        maxRows: 50000,
        seenItemIds: seen,
      }),
    ).toBe(false);
  });
});

describe('purchase order modal last count column', () => {
  test('PurchaseOrdersModal loads counted_at from inventory_count_verifications', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const modal = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/PurchaseOrdersModal.tsx'),
      'utf-8',
    );

    expect(modal).toContain('fetchLatestInventoryCountTimesClient');
    expect(modal).toContain('ตรวจนับล่าสุด');
    expect(modal).toContain('last_counted_at');
    expect(modal).not.toMatch(/item\.updated_at[\s\S]*toLocaleString/);
  });

  test('latest count times paginate instead of silently dropping older items', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const client = fs.readFileSync(
      path.resolve(__dirname, '../lib/inventory-latest-count-times-client.ts'),
      'utf-8',
    );

    expect(client).toContain('shouldContinueLatestCountScan');
    expect(client).toContain('.range(');
    expect(client).not.toMatch(/\.limit\(INVENTORY_COUNT_VERIFICATION_SCAN_LIMIT\)/);
  });
});

describe('fetchTodayInventoryCountStatus persistence source', () => {
  test('reads durable inventory_count_verifications instead of deferred audit logs', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const actionsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );

    const fnStart = actionsCode.indexOf('export async function fetchTodayInventoryCountStatus');
    const fnEnd = actionsCode.indexOf('// === FETCH INVENTORY ACCURACY REPORT ===', fnStart);
    const fnBody = actionsCode.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);

    expect(fnBody).toContain('inventory_count_verifications');
    expect(fnBody).toContain('buildTodayCountStatusFromVerifications');
    expect(fnBody).toContain('mergeTodayCountStatuses');
    expect(fnBody).toContain('buildTodayCountStatusFromLogs');
  });
});

describe('inventory count save verification persistence', () => {
  test('recordInventoryCountAndUpdateStock inserts verification for all count policies', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const actionsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );

    const fnStart = actionsCode.indexOf('export async function recordInventoryCountAndUpdateStock');
    const fnEnd = actionsCode.indexOf('// === FETCH COUNT ACCURACY STATS ===', fnStart);
    const fnBody = actionsCode.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
    const afterIdx = fnBody.indexOf('after(async () => {');
    const criticalPath = fnBody.slice(0, afterIdx);

    expect(criticalPath).toContain('inventory_count_verifications');
    expect(criticalPath).not.toMatch(/if\s*\(\s*countPolicy\s*===\s*'exact_count'\s*\)[\s\S]*inventory_count_verifications/);
  });

  test('count save updates stock before inserting a verification row', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const actionsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );

    const fnStart = actionsCode.indexOf('export async function recordInventoryCountAndUpdateStock');
    const fnEnd = actionsCode.indexOf('// === FETCH COUNT ACCURACY STATS ===', fnStart);
    const fnBody = actionsCode.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
    const afterIdx = fnBody.indexOf('after(async () => {');
    const criticalPath = fnBody.slice(0, afterIdx);

    expect(criticalPath).toMatch(
      /set_inventory_stock[\s\S]*inventory_count_verifications[\s\S]*\.insert\(/,
    );
  });

  test('count undo deletes the saved verification id instead of the latest row', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const actionsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );
    const countPage = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
      'utf-8',
    );

    const fnStart = actionsCode.indexOf('export async function recordInventoryCountAndUpdateStock');
    const fnEnd = actionsCode.indexOf('// === FETCH COUNT ACCURACY STATS ===', fnStart);
    const fnBody = actionsCode.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
    const afterIdx = fnBody.indexOf('after(async () => {');
    const criticalPath = fnBody.slice(0, afterIdx);

    expect(criticalPath).toContain('undoVerificationId');
    expect(criticalPath).toMatch(/\.insert\([\s\S]*\.select\(['"]id['"]\)/);
    expect(criticalPath).not.toMatch(
      /inventory_count_verifications[\s\S]*\.order\(['"]counted_at['"][\s\S]*\.delete\(/,
    );
    expect(countPage).toContain('undoVerificationId');
    expect(countPage).toContain('verificationId');
  });
});

describe('inventory count page today status UI', () => {
  test('count page shows persisted today session banner and sufficiency quantity feedback', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const countPage = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
      'utf-8',
    );

    expect(countPage).toContain('TodayCountSessionBanner');
    expect(countPage).toContain('initialTodayStatus');
    expect(countPage).toContain('formatInventoryCountTime');
    expect(countPage).toContain('formatCountMatchLabel');
    expect(countPage).toContain('นับเมื่อ');
    expect(countPage).toContain('ระบบ:');
  });
});
