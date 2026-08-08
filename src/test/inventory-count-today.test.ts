import { describe, expect, test } from 'vitest';
import {
  applyItemTodayCount,
  buildTodayCountStatusFromLogs,
  buildTodayCountStatusFromVerifications,
  extractStockQtyFromCountLog,
  formatInventoryCountTime,
  getBangkokTodayUtcBounds,
  removeItemTodayCount,
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
