import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(__dirname, '..', '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

describe('inventory count adjust tab', () => {
  test('count page exposes count and adjust tabs with shared item ordering', () => {
    const countPage = read('src/app/[locale]/inventory/count/InventoryCountClient.tsx');

    expect(countPage).toContain("type CountPageMode = 'count' | 'adjust'");
    expect(countPage).toContain('role="tablist"');
    expect(countPage).toContain('ตรวจนับ');
    expect(countPage).toContain('ปรับจำนวน');
    expect(countPage).toContain('SlidersHorizontal');
    expect(countPage).toContain('.order(\'sort_order\', { ascending: true })');
    expect(countPage).toContain('pageMode === \'count\'');
    expect(countPage).toContain('AdjustItemRow');
    expect(countPage).toContain('AdjustStockInput');
    expect(countPage).toContain('handleAdjustStock');
  });

  test('adjust tab saves via updateInventoryStock without count verification', () => {
    const countPage = read('src/app/[locale]/inventory/count/InventoryCountClient.tsx');

    expect(countPage).toContain('updateInventoryStock');
    expect(countPage).toContain('handleAdjustStock');
    expect(countPage).toContain("notificationContext: 'inventory_count'");
    expect(countPage).toContain('suppressNotification: true');
    expect(countPage).not.toMatch(/handleAdjustStock[\s\S]*recordInventoryCountAndUpdateStock/);
    expect(countPage).not.toMatch(/AdjustItemRow[\s\S]*Undo2/);
    expect(countPage).not.toContain('adjustUndoMap');
  });

  test('adjust tab requires edit PIN before entry', () => {
    const countPage = read('src/app/[locale]/inventory/count/InventoryCountClient.tsx');
    const pinDialog = read('src/app/[locale]/inventory/count/_components/CountAdjustPinDialog.tsx');
    const access = read('src/lib/inventory-count-adjust-access.ts');

    expect(countPage).toContain('CountAdjustPinDialog');
    expect(countPage).toContain('adjustPinOpen');
    expect(countPage).toContain('isCountAdjustUnlocked');
    expect(countPage).toContain("nextMode === 'adjust' && !adjustUnlocked");
    expect(pinDialog).toContain('verifyPin');
    expect(pinDialog).toContain('res.isReadOnly');
    expect(pinDialog).toContain('รหัสสิทธิ์แก้ไข');
    expect(access).toContain('COUNT_ADJUST_UNLOCK_KEY');
  });

  test('adjust inputs stay editable and sync from realtime stock', () => {
    const countPage = read('src/app/[locale]/inventory/count/InventoryCountClient.tsx');

    expect(countPage).toContain('formatAdjustStockDisplay');
    expect(countPage).toContain('isEditingRef');
    expect(countPage).toContain('stock={Number(item.stock) || 0}');
    expect(countPage).toContain('mergeInventoryRealtimeUpdate');
  });

  test('today count banner stays on count tab only', () => {
    const countPage = read('src/app/[locale]/inventory/count/InventoryCountClient.tsx');

    expect(countPage).toContain('pageMode === \'count\' && <TodayCountSessionBanner');
  });
});
