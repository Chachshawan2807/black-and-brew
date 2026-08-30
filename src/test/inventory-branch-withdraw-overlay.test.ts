import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { mapSecretaryReorderItemsToInventoryRealtime } from '@/lib/inventory-branch-withdraw-seed';

const ROOT = path.resolve(__dirname, '..');

describe('inventory branch withdraw overlay', () => {
  test('maps secretary snapshot rows into inventory realtime shape', () => {
    const mapped = mapSecretaryReorderItemsToInventoryRealtime([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'เมล็ดกาแฟ',
        source: 'สาขา 2',
        stock: 12,
        order_qty: 0,
        order_point: 5,
        target_stock: 20,
        unit: 'kg',
        sort_order: 3,
        computedOrderQty: 8,
      },
    ]);

    expect(mapped[0]).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'เมล็ดกาแฟ',
      stock: 12,
      source: 'สาขา 2',
      sort_order: 3,
    });
  });

  test('overlay renders client immediately with snapshot seed and flex mobile shell', () => {
    const overlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/BranchWithdrawOverlay.tsx'),
      'utf-8',
    );
    expect(overlay).toContain('seedItems');
    expect(overlay).toContain('mapSecretaryReorderItemsToInventoryRealtime');
    expect(overlay).not.toContain('dynamic(');
    expect(overlay).toMatch(/layoutClassName="[^"]*p-3[^"]*"/);
    expect(overlay).toContain('max-md:h-[min(85svh,calc(100dvh-3.75rem))]');
    expect(overlay).toContain('flex-col overflow-hidden');
    expect(overlay).toMatch(/flex min-h-0 flex-1 flex-col overflow-hidden[\s\S]*flex min-h-0 flex-1 flex-col overflow-hidden/);
    expect(overlay).not.toMatch(/h-\[min\(92svh,100%\)\]/);
    expect(overlay).toContain('document.body.style.overflow = \'hidden\'');
  });

  test('embedded branch withdraw uses scroll body with fixed footer actions', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
      'utf-8',
    );
    expect(client).toContain('min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto bb-smooth-scroll');
    expect(client).toMatch(
      /embedded\s*\?\s*'shrink-0 border-t border-border bg-background py-3/,
    );
    expect(client).toMatch(
      /:\s*'sticky bottom-0 z-20 mt-2 border-t border-border bg-background\/95 py-4 backdrop-blur/,
    );
  });
});
