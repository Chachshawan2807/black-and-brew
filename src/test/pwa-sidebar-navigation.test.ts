import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, 'src', relativePath), 'utf-8');
}

function readPublicFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, 'public', relativePath), 'utf-8');
}

describe('PWA sidebar navigation reliability', () => {
  test('service worker does not cache document navigations', () => {
    const sw = readPublicFile('sw.js');
    expect(sw).toContain('shouldCacheResponse');
    expect(sw).toContain("request.mode === 'navigate'");
    expect(sw).toMatch(/shouldCacheResponse[\s\S]*navigate[\s\S]*return false/);
  });

  test('service worker only serves exact navigation cache match before offline fallback', () => {
    const sw = readPublicFile('sw.js');
    expect(sw).toContain('resolveNavigationCacheFallback');
    expect(sw).not.toMatch(/resolveOfflineNavigationFallback\(\)[\s\S]*return fallback[\s\S]*request\.mode === 'navigate'/);
  });

  test('mobile drawer closes immediately for navigation without scroll animation', () => {
    const drawer = readFile('components/sidebar/MobileNavDrawer.tsx');
    const hook = readFile('hooks/use-mobile-nav-drawer.ts');
    const menu = readFile('components/sidebar/Menu.tsx');

    expect(hook).toContain('closeDrawerForNavigation');
    expect(drawer).toContain('closeDrawerForNavigation');
    expect(menu).toContain('closeDrawerForNavigation');
    expect(drawer).toMatch(/closeDrawerForNavigation[\s\S]*hidePopoverIfNeeded/);
  });

  test('view transition navigation resolves with a safety timeout', () => {
    const state = readFile('lib/view-transition-navigation-state.ts');
    expect(state).toContain('VIEW_TRANSITION_NAV_TIMEOUT_MS');
    expect(state).toMatch(/setTimeout[\s\S]*completeViewTransitionNavigation/);
  });

  test('view transition navigates synchronously and ignores superseded callbacks', () => {
    const lib = readFile('lib/view-transition.ts');
    expect(lib).not.toContain("import { startTransition } from 'react'");
    expect(lib).toContain('navigationGeneration');
    expect(lib).toMatch(/if \(generation !== navigationGeneration\)/);
    expect(lib).toMatch(/document\.startViewTransition\(\(\) => \{[\s\S]*navigate\(href\)/);
    expect(lib).toContain('navigateWithoutViewTransition');
    expect(lib).toContain('invalidatePendingViewTransitionNavigations');
  });

  test('view transition bridge closes mobile drawer on internal link click', () => {
    const nav = readFile('components/shell/ViewTransitionNavigation.tsx');
    expect(nav).toContain('closeDrawerForNavigation');
    expect(nav).toContain('normalizeAppPath');
    expect(nav).toContain('if (!shouldUseViewTransition() && !isInstantNav) return');
    expect(nav).not.toMatch(/useEffect\(\(\) => \{\s*if \(!shouldUseViewTransition\(\)\) return;\s*const onDocumentClick/);
  });

  test('instant nav links bypass view transitions even when view transitions are disabled', () => {
    const nav = readFile('components/shell/ViewTransitionNavigation.tsx');
    expect(nav).toContain("dataset.bbNav === 'instant'");
    expect(nav).toContain('const isInstantNav');
    expect(nav).toMatch(/if \(!shouldUseViewTransition\(\) && !isInstantNav\) return;[\s\S]*event\.preventDefault\(\)/);
    expect(nav).toContain('navigateWithoutViewTransition');
  });

  test('auth session guard retries before forcing logout reload', () => {
    const guard = readFile('components/auth/AuthSessionGuard.tsx');
    expect(guard).toContain('SESSION_VERIFY_MAX_ATTEMPTS');
    expect(guard).toMatch(/catch[\s\S]*\/\/.*network|catch[\s\S]*return/);
  });

  test('PinGateway renders app shell while verifying existing client session', () => {
    const pin = readFile('components/auth/PinGateway.tsx');
    expect(pin).toContain('authCheckComplete');
    expect(pin).toContain('hadClientSession');
    expect(pin).toContain('isRestoringSession');
    expect(pin).toContain('supabaseSessionTask');
    expect(pin).toMatch(/isAuthenticated \|\| isRestoringSession[\s\S]*InventoryRealtimeProvider/);
    expect(pin).not.toContain('/images/logo.png');
  });

  test('mobile drawer skips history.back when closing for route navigation', () => {
    const drawer = readFile('components/sidebar/MobileNavDrawer.tsx');
    const hook = readFile('hooks/use-mobile-back-layer.ts');

    expect(drawer).toContain('closingForNavigationRef');
    expect(drawer).toMatch(/closingForNavigationRef\.current = true[\s\S]*setIsOpen\(false\)/);
    expect(hook).toContain('closingForNavigationRef');
    expect(hook).toContain('closingForNavigation');
  });

  test('mobile overlays intercept system back via history state instead of exiting PWA', () => {
    const hook = readFile('hooks/use-mobile-back-layer.ts');
    const drawer = readFile('components/sidebar/MobileNavDrawer.tsx');
    const panel = readFile('components/notifications/NotificationPanel.tsx');
    const quickFab = readFile('app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx');

    expect(hook).toContain('history.pushState');
    expect(hook).toContain('popstate');
    expect(drawer).toContain('useMobileBackLayer');
    expect(drawer).toContain("'mobile-nav-drawer'");
    expect(panel).toContain('useMobileBackLayer');
    expect(panel).toContain("'notification-panel'");
    expect(quickFab).toContain('useMobileBackLayer');
    expect(quickFab).toContain("'quick-action-overlay'");
  });
});
