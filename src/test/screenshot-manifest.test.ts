import { describe, expect, test } from 'vitest';
import manifest from '../../docs/marketing/screenshots/manifest.json';

describe('screenshot manifest', () => {
  test('mobile list includes branch withdraw and notification panel variant', () => {
    const routes = manifest.mobile.map((s) => s.route);
    expect(manifest.mobile).toHaveLength(12);
    expect(routes).toContain('/en/inventory/branch-withdraw');
    const inventoryRoutes = manifest.mobile.filter((s) => s.route === '/en/inventory');
    expect(inventoryRoutes).toHaveLength(2);
    expect(inventoryRoutes.some((s) => s.openNotificationPanel === true)).toBe(true);
  });

  test('desktop includes branch withdraw', () => {
    expect(manifest.desktop.map((s) => s.route)).toContain('/en/inventory/branch-withdraw');
    expect(manifest.desktop).toHaveLength(5);
  });
});
