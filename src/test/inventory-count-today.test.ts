import { describe, expect, test } from 'vitest';
import {
  applyItemTodayCount,
  buildTodayCountStatusFromLogs,
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
