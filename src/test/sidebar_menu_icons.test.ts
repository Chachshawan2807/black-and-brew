import { describe, expect, test } from 'vitest';

import { getMenuList } from '@/lib/menu-list';

describe('sidebar menu icons', () => {
  test('bean orders and accuracy use distinct semantic icons', () => {
    const menus = getMenuList('/th', 'th').flatMap((group) => group.menus);
    const byId = new Map(menus.map((menu) => [menu.id, menu]));

    expect(byId.get('bean-orders')?.icon.displayName).toBe('Coffee');
    expect(byId.get('inventory-accuracy')?.icon.displayName).toBe('Gauge');

    const icons = [
      byId.get('bean-orders')?.icon,
      byId.get('inventory-accuracy')?.icon,
    ];

    expect(new Set(icons).size).toBe(2);
  });
});
