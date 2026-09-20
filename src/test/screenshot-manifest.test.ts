import { describe, expect, test } from 'vitest';
import manifest from '../../docs/marketing/screenshots/manifest.json';

const SIDEBAR_ROUTES = [
  '/th/home',
  '/th/dashboard',
  '/th/schedule',
  '/th/maintenance',
  '/th/inventory',
  '/th/inventory/count',
  '/th/inventory/accuracy',
  '/th/inventory/branch-withdraw',
  '/th/bean-orders',
  '/th/settings',
];

describe('screenshot manifest', () => {
  test('mobile covers every sidebar route plus notification FAB panel', () => {
    const routes = manifest.mobile.map((s) => s.route);
    expect(manifest.mobile).toHaveLength(11);
    expect(manifest.mobile.find((s) => s.id === '07-branch-withdraw')?.scrollBranchWithdrawBody).toBe(
      'bottom',
    );
    for (const route of SIDEBAR_ROUTES) {
      expect(routes).toContain(route);
    }
    expect(routes).not.toContain('/th/bean-orders/new');
    expect(manifest.mobile.some((s) => s.openNotificationPanel === true)).toBe(true);
    expect(manifest.mobile.find((s) => s.id === '11-notifications')?.route).toBe('/th/inventory');
  });

  test('desktop covers every sidebar route and keeps branch withdraw', () => {
    const routes = manifest.desktop.map((s) => s.route);
    expect(manifest.desktop).toHaveLength(10);
    for (const route of SIDEBAR_ROUTES) {
      expect(routes).toContain(route);
    }
  });

  test('dashboard shots use fixed presentation date range', () => {
    expect(manifest.dashboardScreenshotRange).toEqual({
      start: '2026-08-26',
      end: '2026-09-25',
    });
    const mobileDash = manifest.mobile.find((s) => s.id === '02-dashboard');
    const desktopDash = manifest.desktop.find((s) => s.id === 'd-dashboard');
    expect(mobileDash?.dashboardRange).toBe(true);
    expect(desktopDash?.dashboardRange).toBe(true);
  });
});
