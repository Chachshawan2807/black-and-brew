import { describe, expect, test } from 'vitest';

import { getMenuList } from '@/lib/menu-list';

describe('sidebar menu icons', () => {
  test('does not show a pending-work count on the home menu item', () => {
    const menus = getMenuList('/th/home', 'th', { homePendingCount: 3 }).flatMap((group) => group.menus);
    const home = menus.find((menu) => menu.id === 'home');

    expect(home?.badgeCount).toBeUndefined();
  });

  test('bean orders and accuracy use distinct semantic icons', () => {
    const menus = getMenuList('/th', 'th').flatMap((group) => group.menus);
    const byId = new Map(menus.map((menu) => [menu.id, menu]));

    expect(byId.get('bean-orders')?.icon.displayName).toBe('Coffee');
    expect(byId.get('inventory-accuracy')?.icon.displayName).toBe('ChartColumn');
    expect(byId.get('dashboard')?.icon.displayName).toBe('Users');

    const icons = [
      byId.get('bean-orders')?.icon,
      byId.get('inventory-accuracy')?.icon,
    ];

    expect(new Set(icons).size).toBe(2);
  });
});
