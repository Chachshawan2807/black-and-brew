import { describe, expect, test } from 'vitest';

import { getMenuList } from '@/lib/menu-list';

describe('sidebar menu icons', () => {
  test('sales, market insights, and accuracy use distinct semantic icons', () => {
    const menus = getMenuList('/th', 'th').flatMap((group) => group.menus);
    const byId = new Map(menus.map((menu) => [menu.id, menu]));

    expect(byId.get('sales')?.icon.displayName).toBe('HandCoins');
    expect(byId.get('market-insights')?.icon.displayName).toBe('Radar');
    expect(byId.get('inventory-accuracy')?.icon.displayName).toBe('Gauge');

    const icons = [
      byId.get('sales')?.icon,
      byId.get('market-insights')?.icon,
      byId.get('inventory-accuracy')?.icon,
    ];

    expect(new Set(icons).size).toBe(3);
  });
});
