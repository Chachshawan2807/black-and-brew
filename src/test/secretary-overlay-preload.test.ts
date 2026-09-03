import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('secretary overlay preload', () => {
  test('SecretaryClient preloads overlay chunks and data on idle and pointer intent', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/SecretaryClient.tsx'),
      'utf-8',
    );

    expect(client).toContain('preloadSecretaryOverlayForTask');
    expect(client).toContain('preloadSecretaryTaskOverlayShell');
    expect(client).toContain('scheduleIdleWork');
    expect(client).toContain('onPointerDown={canOpenDetail ? warmOverlayChunk : undefined}');
    expect(client).toContain("import SecretaryTaskOverlay from './_components/SecretaryTaskOverlay'");
    expect(client).toContain('preloadSecretaryManualTaskDialog');
  });

  test('overlay data cache deduplicates server fetches', () => {
    const cache = fs.readFileSync(
      path.resolve(ROOT, 'lib/secretary/overlay-data-cache.ts'),
      'utf-8',
    );

    expect(cache).toContain('prefetchBeanOrdersForOverlay');
    expect(cache).toContain('prefetchScheduleOverlayData');
    expect(cache).toContain('peekBeanOrdersForOverlay');
    expect(cache).not.toContain('prefetchInventoryCountOverlayData');
  });

  test('task-specific preload warms chunks before open', () => {
    const preload = fs.readFileSync(
      path.resolve(ROOT, 'lib/secretary/preload-secretary-overlay.ts'),
      'utf-8',
    );

    expect(preload).toContain('bean_orders_panel');
    expect(preload).toContain('schedule_panel');
    expect(preload).toContain('preloadPurchaseOrdersModal');
    expect(preload).toContain('BeanOrdersOverlay');
    expect(preload).toContain('BranchWithdrawOverlay');
    expect(preload).toContain('ScheduleOverlay');
    expect(preload).toContain('SecretaryTaskListOverlay');
    expect(preload).toContain('SecretaryTaskInfoOverlay');
    expect(preload).toContain('preloadSecretaryManualTaskDialog');
    expect(preload).toContain('isManualSecretaryTask');
    expect(preload).not.toContain('inventory_count_panel');
  });

  test('SecretaryTaskOverlay defers overlay variants behind dynamic imports', () => {
    const overlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskOverlay.tsx'),
      'utf-8',
    );

    expect(overlay).toMatch(/dynamic\(\(\) => import\('\.\/BeanOrdersOverlay'\)/);
    expect(overlay).toMatch(/dynamic\(\(\) => import\('\.\/BranchWithdrawOverlay'\)/);
    expect(overlay).toMatch(/dynamic\(\(\) => import\('\.\/ScheduleOverlay'\)/);
    expect(overlay).toMatch(/dynamic\(\(\) => import\('\.\/SecretaryManualTaskDialog'\)/);
    expect(overlay).not.toMatch(/^import BeanOrdersOverlay from/m);
    expect(overlay).not.toMatch(/^import BranchWithdrawOverlay from/m);
  });
});
