import { describe, expect, test } from 'vitest';
import { computeOrderQty, computeItemsToOrder, isItemNeedingReorder } from '@/lib/inventory-stock';
import { EXECUTIVE_RULES } from '@/lib/agents/executive-rules';
import fs from 'fs';
import path from 'path';

/** Read TABLE_MAX_LIMITS.inventory_items without importing the gateway (side-effectful module). */
function getTableMaxLimits(): Record<string, number> {
  const toolCode = fs.readFileSync(
    path.resolve(__dirname, '../lib/ai-data-gateway.ts'),
    'utf-8'
  );
  const block = toolCode.match(
    /export const TABLE_MAX_LIMITS[^=]*=\s*\{([\s\S]*?)\};/
  )?.[1];
  if (!block) throw new Error('TABLE_MAX_LIMITS not found in ai-data-gateway.ts');

  return Object.fromEntries(
    [...block.matchAll(/(\w+):\s*(\d+)/g)].map(([, key, value]) => [key, Number(value)])
  );
}

describe('AI Inventory Analysis Rules', () => {
  test('uses the same low-stock rule as the purchase order UI', () => {
    const stock = 5;
    const orderPoint = 10;
    const targetStock = 20;

    const computedOrderQty = computeOrderQty(stock, orderPoint, targetStock);
    expect(computedOrderQty).toBeGreaterThan(0);
    expect(computedOrderQty).toBe(targetStock - stock);

    const items = [
      {
        id: '1',
        name: 'Test Item',
        stock,
        order_point: orderPoint,
        target_stock: targetStock,
        unit: 'ชิ้น',
      },
    ];
    const toOrder = computeItemsToOrder(items);
    expect(toOrder).toHaveLength(1);
    expect(toOrder[0].computedOrderQty).toBeGreaterThan(0);
  });

  test('allows readTable to fetch a full inventory table instead of defaulting to 50 rows', () => {
    const TABLE_MAX_LIMITS = getTableMaxLimits();
    expect(TABLE_MAX_LIMITS.inventory_items).toBe(1000);
  });

  test('excludes items at order point when target stock is already met (PO modal parity)', () => {
    const atPointButTargetMet = {
      id: '2',
      name: 'Oat milk',
      stock: 10,
      order_point: 12,
      target_stock: 10,
      unit: 'กล่อง',
    };
    expect(isItemNeedingReorder(10, 12, 10)).toBe(false);
    expect(computeItemsToOrder([atPointButTargetMet])).toHaveLength(0);
  });

  test('documents low-stock evaluation with inclusive threshold and target-stock guard', () => {
    const rulesJson = JSON.stringify(EXECUTIVE_RULES);
    expect(rulesJson).toContain('stock <= order_point');
    expect(rulesJson).toContain('target_stock > stock');
  });
});
