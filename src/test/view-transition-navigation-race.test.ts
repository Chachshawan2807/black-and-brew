import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  navigateWithViewTransition,
  navigateWithoutViewTransition,
  resetViewTransitionNavigationGenerationForTests,
  shouldUseViewTransition,
} from '@/lib/view-transition';
import { resetViewTransitionNavigationForTests } from '@/lib/view-transition-navigation-state';

function resetNavHarness() {
  resetViewTransitionNavigationForTests();
  resetViewTransitionNavigationGenerationForTests();
}

const ROOT = resolve(__dirname, '../..');

describe('view transition navigation race', () => {
  const originalMatchMedia = window.matchMedia;
  const originalStartViewTransition = document.startViewTransition;

  beforeEach(() => {
    resetNavHarness();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    resetNavHarness();
    window.matchMedia = originalMatchMedia;
    if (originalStartViewTransition) {
      document.startViewTransition = originalStartViewTransition;
    } else {
      delete (document as { startViewTransition?: unknown }).startViewTransition;
    }
    vi.restoreAllMocks();
  });

  test('shouldUseViewTransition is true in this harness', () => {
    document.startViewTransition = vi.fn() as unknown as typeof document.startViewTransition;
    expect(shouldUseViewTransition()).toBe(true);
  });

  test('stale view-transition navigations are ignored when a newer one starts first', () => {
    const navigated: string[] = [];
    const updateCallbacks: Array<() => void | Promise<void>> = [];

    document.startViewTransition = ((update) => {
      updateCallbacks.push(update);
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      };
    }) as typeof document.startViewTransition;

    navigateWithViewTransition((href) => navigated.push(href), '/th/inventory/count');
    navigateWithViewTransition((href) => navigated.push(href), '/th/bean-orders');

    // Older transition callback runs after a newer navigation was requested
    // (simulates slow inventory/count RSC racing a later bean-orders click).
    void updateCallbacks[0]?.();
    void updateCallbacks[1]?.();

    expect(navigated).toEqual(['/th/bean-orders']);
  });

  test('navigate runs synchronously inside the view-transition update callback', () => {
    const lib = readFileSync(resolve(ROOT, 'src/lib/view-transition.ts'), 'utf-8');

    expect(lib).not.toMatch(/startTransition\s*\(\s*\(\)\s*=>\s*\{\s*navigate\(href\)/);
    expect(lib).not.toContain("import { startTransition } from 'react'");
    expect(lib).toMatch(/document\.startViewTransition\(\(\) => \{[\s\S]*navigate\(href\)/);
  });

  test('programmatic navigateWithoutViewTransition cancels a pending view-transition soft nav', () => {
    const navigated: string[] = [];
    const updateCallbacks: Array<() => void | Promise<void>> = [];

    document.startViewTransition = ((update) => {
      updateCallbacks.push(update);
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      };
    }) as typeof document.startViewTransition;

    navigateWithViewTransition((href) => navigated.push(href), '/th/inventory/count');
    navigateWithoutViewTransition((href) => navigated.push(href), '/th/bean-orders?week=1');

    void updateCallbacks[0]?.();

    expect(navigated).toEqual(['/th/bean-orders?week=1']);
  });
});

describe('programmatic navigations cancel stale view transitions', () => {
  function readSrc(relativePath: string): string {
    return readFileSync(resolve(ROOT, 'src', relativePath), 'utf-8');
  }

  test('bean-orders form/detail return via navigateWithViewTransition', () => {
    const form = readSrc('app/[locale]/bean-orders/BeanOrderFormClient.tsx');
    const detail = readSrc('app/[locale]/bean-orders/BeanOrderDetailClient.tsx');

    expect(form).toContain('navigateWithViewTransition');
    expect(form).toMatch(/navigateWithViewTransition\(\s*router\.push,\s*`\/\$\{locale\}\/bean-orders`\s*\)/);
    expect(form).not.toMatch(/router\.push\(`\/\$\{locale\}\/bean-orders`\)/);

    expect(detail).toContain('navigateWithViewTransition');
    expect(detail).toMatch(/navigateWithViewTransition\(\s*router\.push,\s*`\/\$\{locale\}\/bean-orders`\s*\)/);
    expect(detail).not.toMatch(/router\.push\(`\/\$\{locale\}\/bean-orders`\)/);
  });

  test('schedule and dashboard query navigations invalidate pending view transitions', () => {
    const schedule = readSrc('app/[locale]/schedule/ScheduleClient.tsx');
    const dashboard = readSrc('app/[locale]/dashboard/_components/LiveShiftList.tsx');

    expect(schedule).toContain('navigateWithoutViewTransition');
    expect(schedule).toMatch(
      /navigateWithoutViewTransition\(\s*router\.push,\s*`\?week=\$\{e\.target\.value\}`\s*\)/,
    );
    expect(schedule).not.toMatch(/router\.push\(`\?week=\$\{e\.target\.value\}`\)/);

    expect(dashboard).toContain('navigateWithoutViewTransition');
    expect(dashboard).toMatch(
      /navigateWithoutViewTransition\(\s*router\.push,\s*`\?start=\$\{start\}&end=\$\{end\}`\s*\)/,
    );
    expect(dashboard).not.toMatch(/router\.push\(`\?start=\$\{start\}&end=\$\{end\}`\)/);
  });
});
