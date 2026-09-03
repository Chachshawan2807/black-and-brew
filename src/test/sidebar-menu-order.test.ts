import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  applySidebarMenuOrder,
  parseSidebarMenuOrder,
} from '@/lib/sidebar-menu-order';

describe('sidebar menu order', () => {
  test('parses legacy localStorage array format', () => {
    const raw = JSON.stringify(['bean-orders', 'home', 'inventory']);
    expect(parseSidebarMenuOrder(raw)).toEqual(['bean-orders', 'home', 'inventory']);
  });

  test('applies saved order and appends new menu items', () => {
    const menus = [
      { id: 'home' },
      { id: 'dashboard' },
      { id: 'bean-orders' },
    ] as const;

    const ordered = applySidebarMenuOrder(menus, ['bean-orders', 'home']);
    expect(ordered.map((menu) => menu.id)).toEqual(['bean-orders', 'home', 'dashboard']);
  });

  test('Menu uses shared sidebar menu order store', () => {
    const menu = readFile('components/sidebar/Menu.tsx');
    expect(menu).toMatch(/useSidebarMenuOrder/);
    expect(menu).not.toMatch(/const STORAGE_KEY = 'sidebar-menu-order'/);
  });

  test('sidebar menu order hook persists with shared storage key', () => {
    const hook = readFile('hooks/use-sidebar-menu-order.ts');
    expect(hook).toMatch(/name:\s*SIDEBAR_MENU_ORDER_KEY/);
    expect(hook).toMatch(/addEventListener\('storage'/);
  });

  test('sidebar layout mounts cross-device menu order sync', () => {
    const layout = readFile('components/sidebar/SidebarLayout.tsx');
    expect(layout).toMatch(/SidebarMenuOrderSync/);
  });
});

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}
