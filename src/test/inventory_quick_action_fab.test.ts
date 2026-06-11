import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Inventory Quick Action FAB', () => {
  test('layout mounts global quick action wrapper above AI chat', () => {
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/layout.tsx'),
      'utf-8',
    );

    expect(layoutCode).toMatch(/<InventoryQuickActionWrapper\s*\/>\s*\r?\n\s*<AIChatOverlay/);
  });

  test('AI chat window stacks above the inventory FAB when open', () => {
    const chatCode = fs.readFileSync(
      path.resolve(__dirname, '../components/ai/AIChatOverlay.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(chatCode).toContain('z-[203]');
    expect(fabCode).toContain('z-[201]');
  });

  test('FAB is positioned above the AI chat trigger with safe-area support', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(fabCode).toContain('z-[201]');
    expect(fabCode).toContain('max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]');
    expect(fabCode).toContain('md:bottom-[5.5rem]');
    expect(fabCode).toContain('InventoryQuickActionBar');
    expect(fabCode).toContain('bg-[#000000]');
    expect(fabCode).toContain('<Package');
    expect(fabCode).not.toContain('PackagePlus');
  });

  test('inventory page reuses shared quick action bar component', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/page.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain('InventoryQuickActionBar');
    expect(pageCode).not.toContain('placeholder="ค้นหาสินค้า..."');
  });
});
