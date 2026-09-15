import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const schedulePagePath = resolve(__dirname, '../app/[locale]/schedule/page.tsx');
const layoutPath = resolve(__dirname, '../app/[locale]/layout.tsx');
const appShellPath = resolve(__dirname, '../components/shell/AppShell.tsx');
const appShellLoaderPath = resolve(__dirname, '../components/shell/AppShellLoader.tsx');
const holidaySyncPath = resolve(__dirname, '../lib/holiday-sync.ts');

describe('loading performance patterns', () => {
  test('schedule page defers holiday sync from critical path', () => {
    const source = readFileSync(schedulePagePath, 'utf-8');
    expect(source).toContain("import { after } from 'next/server'");
    expect(source).toContain('after(async () => {');
    expect(source).not.toMatch(
      /\[profilesRes[\s\S]*fetchAndPersistHolidays/,
    );
  });

  test('root layout defers heavy shell; AppShell defers global overlays', () => {
    const layout = readFileSync(layoutPath, 'utf-8');
    const appShell = readFileSync(appShellPath, 'utf-8');
    const loader = readFileSync(appShellLoaderPath, 'utf-8');
    expect(layout).toContain('AppShellLoader');
    expect(loader).not.toContain('ssr: false');
    expect(appShell).toContain("import PinGateway from '@/components/auth/PinGateway'");
    expect(layout).not.toContain('InventoryQuickActionWrapper');
    expect(layout).not.toContain('AIChatOverlay');
    expect(appShell).toContain('DeferredOverlays');
    expect(appShell).not.toContain('InventoryQuickActionWrapper');
    expect(appShell).not.toContain('AIChatOverlay');
    expect(appShell).toContain('RoutePrefetchOnIdle');
  });

  test('holiday sync batches database writes', () => {
    const source = readFileSync(holidaySyncPath, 'utf-8');
    expect(source).toContain("getSupabaseAdmin()");
    expect(source).toContain('.insert(toInsert)');
    expect(source).not.toMatch(/for \(const \[date, name\] of holidaysByDate\)[\s\S]*maybeSingle\(\)/);
  });

  test('bean order detail page imports client directly for instant navigation', () => {
    const detailPage = readFileSync(
      resolve(__dirname, '../app/[locale]/bean-orders/[id]/page.tsx'),
      'utf-8',
    );
    const listPage = readFileSync(
      resolve(__dirname, '../app/[locale]/bean-orders/page.tsx'),
      'utf-8',
    );
    expect(detailPage).toContain("import BeanOrderDetailClient from '../BeanOrderDetailClient'");
    expect(detailPage).not.toContain('createLazyFeatureClient');
    expect(detailPage).toMatch(/key=\{id\}/);
    expect(listPage).toContain("import BeanOrdersClient from './BeanOrdersClient'");
    expect(listPage).not.toContain('createLazyFeatureClient');
  });

  test('lazy feature client defers to route loading.tsx instead of a second skeleton', () => {
    const lazy = readFileSync(resolve(__dirname, '../lib/lazy-feature-client.tsx'), 'utf-8');
    expect(lazy).toContain('loading: () => null');
    expect(lazy).not.toContain('RouteLoadingSkeleton');
  });
});
