import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(__dirname, '..', '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

describe('inventory count policy', () => {
  test('inventory selects include count policy without a separate sufficiency quantity', () => {
    const queries = read('src/lib/inventory-queries.ts');

    expect(queries).toContain('count_policy');
    expect(queries).not.toContain('sufficiency_order_qty');
  });

  test('inventory page exposes only exact count and sufficiency check policies', () => {
    const inventoryPage = read('src/app/[locale]/inventory/InventoryClient.tsx');

    expect(inventoryPage).toContain('exact_count');
    expect(inventoryPage).toContain('sufficiency_check');
    expect(inventoryPage).toContain('วิธีตรวจนับ');
    expect(inventoryPage).toContain('isManualOrderQty');
    expect(inventoryPage).toContain('bg-[#f8d7da]');
    expect(inventoryPage).not.toContain('จำนวนสั่งเพิ่มถ้าไม่พอใช้');
  });

  test('inventory page uses a compact count policy toggle beside item name', () => {
    const inventoryPage = read('src/app/[locale]/inventory/InventoryClient.tsx');

    expect(inventoryPage).toContain('function CountPolicyToggle');
    expect(inventoryPage).toContain('aria-label="สลับวิธีตรวจนับ"');
    expect(inventoryPage).toContain('ไม่ต้องเบิก');
    expect(inventoryPage).not.toContain('function CountPolicyEditor');
    expect(inventoryPage).not.toContain('function SufficiencyOrderQtyInput');
  });

  test('purchase orders use auto computed order_qty for sufficiency checks', () => {
    const stock = read('src/lib/inventory-stock.ts');

    expect(stock).not.toContain("item.count_policy === 'sufficiency_check'");
    expect(stock).not.toContain('computedOrderQty: manualOrderQty');
  });

  test('count page visually separates exact counts and sufficiency checks', () => {
    const countPage = read('src/app/[locale]/inventory/count/InventoryCountClient.tsx');

    expect(countPage).toContain('bg-[#dbeafe]');
    expect(countPage).toContain('bg-[#f8d7da]');
    expect(countPage).toContain('ต้องเบิก');
    expect(countPage).toContain('ไม่ต้องเบิก');
    expect(countPage).toContain('ประเภท:');
  });

  test('count page does not show total accuracy summary', () => {
    const countPage = read('src/app/[locale]/inventory/count/InventoryCountClient.tsx');

    expect(countPage).not.toContain('ค่าความแม่นยำรวม');
    expect(countPage).not.toContain('Total Accuracy');
    expect(countPage).not.toContain('accuracyStats.overall.accuracyPct');
  });

  test('count policy migration resets legacy accuracy rows', () => {
    const sql = read('supabase/migrations/20260618163100_inventory_count_policy.sql');

    expect(sql).toContain('DELETE FROM public.inventory_count_verifications');
  });

  test('count updates remain the latest stock source for inventory page realtime sync', () => {
    const countPage = read('src/app/[locale]/inventory/count/InventoryCountClient.tsx');
    const inventoryPage = read('src/app/[locale]/inventory/InventoryClient.tsx');

    expect(countPage).toContain('recordInventoryCountAndUpdateStock(id, value');
    expect(inventoryPage).toMatch(/mergeInventoryRealtimeUpdate\(item, p\.new as InventoryItem\)/);
  });

  test('accuracy report excludes sufficiency checks from accuracy', () => {
    const actions = read('src/app/actions/inventory-actions.ts');
    const menu = read('src/lib/menu-list.ts');

    expect(actions).toContain('fetchInventoryAccuracyReport');
    expect(actions).toContain("count_policy', 'exact_count'");
    expect(menu).toContain('/inventory/accuracy');
    expect(menu).toContain('รายงานความแม่นยำ');
  });

  test('accuracy report summary cards use inventory quick action pastel tones', () => {
    const accuracyPage = read('src/app/[locale]/inventory/accuracy/page.tsx');

    expect(accuracyPage).toContain('INVENTORY_QUICK_ACTION_COLORS.order');
    expect(accuracyPage).toContain('INVENTORY_QUICK_ACTION_COLORS.out');
    expect(accuracyPage).toContain('INVENTORY_QUICK_ACTION_COLORS.in');
    expect(accuracyPage).toContain('text-black/60');
  });

  test('history cleanup does not mutate inventory stock', () => {
    const accuracyPage = read('src/app/[locale]/inventory/accuracy/page.tsx');
    const inventoryPage = read('src/app/[locale]/inventory/InventoryClient.tsx');

    expect(accuracyPage).toContain('การลบหรือเคลียร์ประวัติย้อนหลังจะไม่เปลี่ยนยอดคงเหลือ');
    expect(inventoryPage).not.toContain("select('stock')");
    expect(inventoryPage).not.toContain('const newStock = type ===');
  });
});
