import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(__dirname, '..', '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

describe('inventory recommended target stock UI', () => {
  test('inventory client fetches recommendations and merges them into existing rows', () => {
    const inventoryPage = read('src/app/[locale]/inventory/InventoryClient.tsx');

    expect(inventoryPage).toContain('fetchInventoryTargetRecommendations');
    expect(inventoryPage).toContain('recommendationsByItemId');
    expect(inventoryPage).toContain('recommended_target_stock');
    expect(inventoryPage).toContain('recommendation_explanation');
  });

  test('target stock uses compact display inside the existing cell', () => {
    const inventoryPage = read('src/app/[locale]/inventory/InventoryClient.tsx');

    expect(inventoryPage).toContain('formatTargetStockRecommendation');
    expect(inventoryPage).toContain("col.id === 'target_stock'");
    expect(inventoryPage).toContain('20 → 28');
  });

  test('target stock cell has a small detail button without adding a new column', () => {
    const inventoryPage = read('src/app/[locale]/inventory/InventoryClient.tsx');
    const types = read('src/app/[locale]/inventory/types.ts');

    expect(inventoryPage).toContain('aria-label="ตั้งค่าจำนวนที่แนะนำ"');
    expect(inventoryPage).toContain('ใช้ค่าที่แนะนำ');
    expect(inventoryPage).toContain('ความเสี่ยง');
    expect(types).not.toContain("{ id: 'recommended_target_stock'");
  });
});
