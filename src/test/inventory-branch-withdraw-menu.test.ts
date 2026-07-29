import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('branch withdraw navigation', () => {
  test('menu lists branch-withdraw route', () => {
    const menu = fs.readFileSync(path.resolve(__dirname, '../lib/menu-list.ts'), 'utf-8');
    expect(menu).toContain('/inventory/branch-withdraw');
    expect(menu).toContain('เบิกของสาขา 2');
  });

  test('branch-withdraw menu icon differs from inventory Package', () => {
    const menu = fs.readFileSync(path.resolve(__dirname, '../lib/menu-list.ts'), 'utf-8');
    const branchBlock = menu.match(
      /id:\s*'inventory-branch-withdraw'[\s\S]*?submenus:\s*\[\]/,
    );
    expect(branchBlock?.[0]).toBeTruthy();
    expect(branchBlock?.[0]).toContain('icon: Truck');
    expect(branchBlock?.[0]).not.toContain('icon: Package');
  });
});
