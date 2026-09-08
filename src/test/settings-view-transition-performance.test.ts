import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = resolve(__dirname, '../..');

describe('settings lazy-load performance', () => {
  test('settings page defers heavy sections behind dynamic import', () => {
    const page = readFileSync(resolve(ROOT, 'src/app/[locale]/settings/page.tsx'), 'utf-8');
    const sections = readFileSync(
      resolve(ROOT, 'src/app/[locale]/settings/_components/SettingsPageSections.tsx'),
      'utf-8',
    );

    expect(page).toContain('createLazyFeatureClient');
    expect(page).toContain('SettingsPageSections');
    expect(page).not.toContain('DataChangeHistorySection');
    expect(page).not.toContain('LoginHistorySection');
    expect(page).not.toContain('PasskeyDeviceSection');
    expect(sections).toContain('SettingsLazyCollapsibleSection');
    expect(sections).toContain("load={() => import('./DataChangeHistorySection')}");
    expect(sections).toContain("load={() => import('./LoginHistorySection')}");
    expect(sections).toContain("load={() => import('./PasskeyDeviceSection')}");
    expect(sections).toContain('preloadSettingsSectionsOnIdle');
  });

  test('collapsible section prepares chunk and data on hover or focus before open', () => {
    const collapsible = readFileSync(
      resolve(ROOT, 'src/app/[locale]/settings/_components/SettingsCollapsibleSection.tsx'),
      'utf-8',
    );
    const lazy = readFileSync(
      resolve(ROOT, 'src/app/[locale]/settings/_components/SettingsLazyCollapsibleSection.tsx'),
      'utf-8',
    );

    expect(collapsible).toContain('onPrepare?: () => void');
    expect(collapsible).toContain('onPrepare?.()');
    expect(collapsible).toContain('onPointerEnter={prepare}');
    expect(collapsible).not.toContain('description');
    expect(lazy).toContain('onPrepare={prepareSection}');
    expect(lazy).toContain('preloadSettingsSection(sectionKey)');
    expect(lazy).toContain('void load()');
  });

  test('login history uses shared settings data cache with slimmer initial limit', () => {
    const loginHistory = readFileSync(
      resolve(ROOT, 'src/app/[locale]/settings/_components/LoginHistorySection.tsx'),
      'utf-8',
    );
    const cache = readFileSync(resolve(ROOT, 'src/lib/settings-section-data-cache.ts'), 'utf-8');

    expect(loginHistory).toContain('getOrFetchLoginHistoryBundle');
    expect(loginHistory).toContain('LOGIN_HISTORY_INITIAL_LIMIT');
    expect(loginHistory).not.toContain('fetchLoginHistoryBundle(200)');
    expect(loginHistory).toContain('loadGenRef');
    expect(cache).toContain('LOGIN_HISTORY_INITIAL_LIMIT = 20');
  });

  test('notification preferences skip server sync on first mount', () => {
    const notifications = readFileSync(
      resolve(ROOT, 'src/app/[locale]/settings/_components/NotificationPreferencesSection.tsx'),
      'utf-8',
    );

    expect(notifications).toContain('prefsHydratedRef');
    expect(notifications).toContain('requestIdleCallback');
    expect(notifications).not.toMatch(
      /useEffect\(\(\) => \{\s*saveNotificationPreferences\(prefs\);/,
    );
  });


  test('edit history and passkey sections use shared settings data cache', () => {
    const editHistory = readFileSync(
      resolve(ROOT, 'src/app/[locale]/settings/_components/DataChangeHistorySection.tsx'),
      'utf-8',
    );
    const passkey = readFileSync(
      resolve(ROOT, 'src/app/[locale]/settings/_components/PasskeyDeviceSection.tsx'),
      'utf-8',
    );

    expect(editHistory).toContain('getOrFetchEditHistory');
    expect(passkey).toContain('getOrFetchPasskeyStatus');
  });

  test('settings sections omit per-section descriptions', () => {
    const sections = readFileSync(
      resolve(ROOT, 'src/app/[locale]/settings/_components/SettingsPageSections.tsx'),
      'utf-8',
    );

    expect(sections).not.toContain('description=');
  });
});

describe('view transition navigation', () => {
  test('view transition helper waits for route paint completion', () => {
    const lib = readFileSync(resolve(ROOT, 'src/lib/view-transition.ts'), 'utf-8');
    const state = readFileSync(resolve(ROOT, 'src/lib/view-transition-navigation-state.ts'), 'utf-8');

    expect(lib).toContain('document.startViewTransition');
    expect(lib).toContain('beginViewTransitionNavigation');
    expect(lib).toContain('prefers-reduced-motion');
    expect(state).toContain('completeViewTransitionNavigation');
  });

  test('layout mounts global view transition navigation bridge', () => {
    const layout = readFileSync(resolve(ROOT, 'src/app/[locale]/layout.tsx'), 'utf-8');
    const nav = readFileSync(resolve(ROOT, 'src/components/shell/ViewTransitionNavigation.tsx'), 'utf-8');
    const pageTransition = readFileSync(resolve(ROOT, 'src/components/ui/page-transition.tsx'), 'utf-8');
    const css = readFileSync(resolve(ROOT, 'src/app/[locale]/globals.css'), 'utf-8');

    expect(layout).toContain('ViewTransitionNavigation');
    expect(nav).toContain('navigateWithViewTransition');
    expect(nav).toContain("addEventListener('click', onDocumentClick, true)");
    expect(pageTransition).toContain('bb-view-transition-page');
    expect(pageTransition).toContain('completeViewTransitionNavigation');
    expect(css).toContain('::view-transition-new(root)');
    expect(css).toContain('bb-vt-page-in');
    expect(css).toContain('--bb-vt-page-duration-in: 240ms');
    expect(css).toContain('--bb-vt-page-ease:');
  });
});
