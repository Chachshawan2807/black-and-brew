import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import manifest from '@/app/manifest';
import {
  PWA_IOS_LAUNCH_SPLASH_SCRIPT,
  PWA_LAUNCH_SPLASH_CLASS,
  PWA_LAUNCH_SPLASH_ROOT_ID,
  shouldShowIosPwaLaunchSplash,
} from '@/lib/pwa-launch-splash';
import { PWA_DISPLAY_NAME } from '@/lib/pwa-config';
import {
  PWA_ANDROID_CLASS,
  PWA_IOS_CLASS,
  PWA_SHELL_BOOTSTRAP_SCRIPT,
  PWA_STANDALONE_CLASS,
  PWA_THEME_COLORS,
  isAndroidWebKit,
  isIosWebKit,
  mergeViewportContentForIosStandalone,
  resolvePwaThemeColor,
  resolveThemePreferenceFromStorage,
} from '@/lib/pwa-standalone';

const ROOT = resolve(__dirname, '../..');

describe('PWA native shell', () => {
  test('resolvePwaThemeColor matches ERP background tokens', () => {
    expect(resolvePwaThemeColor(false)).toBe(PWA_THEME_COLORS.light);
    expect(resolvePwaThemeColor(true)).toBe(PWA_THEME_COLORS.dark);
  });

  test('resolveThemePreferenceFromStorage respects bb-theme and system fallback', () => {
    expect(resolveThemePreferenceFromStorage('dark', false)).toBe('dark');
    expect(resolveThemePreferenceFromStorage('light', true)).toBe('light');
    expect(resolveThemePreferenceFromStorage('system', true)).toBe('dark');
    expect(resolveThemePreferenceFromStorage(null, false)).toBe('light');
  });

  test('bootstrap script sets standalone class and theme-color before paint', () => {
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain(PWA_STANDALONE_CLASS);
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain(PWA_IOS_CLASS);
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain(PWA_ANDROID_CLASS);
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('theme-color');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('bb-theme');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('display-mode: standalone');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('navigator.standalone');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('maximum-scale=1, user-scalable=no');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('gesturestart');
  });

  test('mergeViewportContentForIosStandalone locks zoom without dropping existing viewport tokens', () => {
    expect(
      mergeViewportContentForIosStandalone(
        'width=device-width, initial-scale=1, viewport-fit=cover',
      ),
    ).toBe('width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no');

    expect(
      mergeViewportContentForIosStandalone(
        'width=device-width, maximum-scale=5, user-scalable=yes',
      ),
    ).toBe('width=device-width, maximum-scale=1, user-scalable=no');
  });

  test('isIosWebKit detects iPhone and iPad user agents', () => {
    expect(isIosWebKit('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIosWebKit('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIosWebKit('Mozilla/5.0 (Linux; Android 14)')).toBe(false);
  });

  test('isAndroidWebKit detects Android user agents', () => {
    expect(isAndroidWebKit('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(true);
    expect(isAndroidWebKit('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false);
  });

  test('mobile app shell avoids stacking header on full viewport main height', () => {
    const layout = readFileSync(resolve(ROOT, 'src/components/sidebar/SidebarLayout.tsx'), 'utf-8');
    expect(layout).toMatch(/flex-1 min-h-0/);
    expect(layout).not.toMatch(/min-h-\[100svh\]/);
  });

  test('mobile nav header grows with safe-area instead of fixed 72px height', () => {
    const header = readFileSync(resolve(ROOT, 'src/components/sidebar/MobileNavHeader.tsx'), 'utf-8');
    const headerClass = header.match(/<header className="([^"]+)"/)?.[1] ?? '';
    expect(headerClass).toContain('min-h-[72px]');
    expect(headerClass).not.toMatch(/(?:^|\s)h-\[72px\](?:\s|$)/);
  });

  test('globals.css applies iOS standalone safe-area and fill-available shell rules', () => {
    const css = readFileSync(resolve(ROOT, 'src/app/[locale]/globals.css'), 'utf-8');
    expect(css).toContain(`.${PWA_IOS_CLASS}`);
    expect(css).toMatch(/-webkit-fill-available/);
    expect(css).toMatch(/bb-mobile-nav-drawer__scroller[\s\S]*env\(safe-area-inset-top/);
    expect(css).toMatch(/bb-main-container[\s\S]*flex:\s*1/);
  });

  test('layout injects PWA shell bootstrap without blocking hydration', () => {
    const layout = readFileSync(resolve(ROOT, 'src/app/[locale]/layout.tsx'), 'utf-8');
    expect(layout).toContain('PWA_SHELL_BOOTSTRAP_SCRIPT');
    expect(layout).toContain('PWA_IOS_LAUNCH_SPLASH_SCRIPT');
    expect(layout).toContain('viewportFit: "cover"');
    expect(layout).toMatch(/themeColor:\s*\[/);
  });

  test('shouldShowIosPwaLaunchSplash is true only for installed iOS PWAs', () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(shouldShowIosPwaLaunchSplash({ userAgent: iphone, isStandalone: true })).toBe(true);
    expect(shouldShowIosPwaLaunchSplash({ userAgent: iphone, isStandalone: false })).toBe(
      false,
    );
    expect(
      shouldShowIosPwaLaunchSplash({
        userAgent: 'Mozilla/5.0 (Linux; Android 14)',
        isStandalone: true,
      }),
    ).toBe(false);
  });

  test('iOS launch splash script paints logo, app name, and dismisses after load', () => {
    expect(PWA_IOS_LAUNCH_SPLASH_SCRIPT).toContain(PWA_LAUNCH_SPLASH_ROOT_ID);
    expect(PWA_IOS_LAUNCH_SPLASH_SCRIPT).toContain(PWA_LAUNCH_SPLASH_CLASS);
    expect(PWA_IOS_LAUNCH_SPLASH_SCRIPT).toContain('/images/notification-icon-512.png');
    expect(PWA_IOS_LAUNCH_SPLASH_SCRIPT).toContain(JSON.stringify(PWA_DISPLAY_NAME));
    expect(PWA_IOS_LAUNCH_SPLASH_SCRIPT).toContain('navigator.standalone');
    expect(PWA_IOS_LAUNCH_SPLASH_SCRIPT).toContain("addEventListener('load'");
  });

  test('globals.css styles iOS PWA launch splash overlay', () => {
    const css = readFileSync(resolve(ROOT, 'src/app/[locale]/globals.css'), 'utf-8');
    expect(css).toContain('.bb-pwa-launch-splash');
    expect(css).toContain('.bb-pwa-launch-splash__title');
    expect(css).toContain('prefers-reduced-motion');
  });

  test('globals.css applies native shell rules only in standalone PWA', () => {
    const css = readFileSync(resolve(ROOT, 'src/app/[locale]/globals.css'), 'utf-8');
    expect(css).toContain(`.${PWA_STANDALONE_CLASS}`);
    expect(css).toMatch(/overscroll-behavior-y:\s*none/);
    expect(css).toContain('-webkit-tap-highlight-color: transparent');
    expect(css).toContain('bb-mobile-nav-header');
    expect(css).toContain('env(safe-area-inset-top');
  });

  test('manifest enables link capture and existing-client launch', () => {
    const m = manifest();
    expect(m.display_override).toContain('standalone');
    expect(m.launch_handler).toEqual({ client_mode: 'navigate-existing' });
    expect(m.handle_links).toBe('preferred');
    expect(m.prefer_related_applications).toBe(false);
  });

  test('manifest omits orientation so Android respects system rotation lock', () => {
    const m = manifest();
    expect(m.orientation).toBeUndefined();
  });

  test('PwaRegister syncs badge on Web Push click without SPA navigation', () => {
    const pwa = readFileSync(resolve(ROOT, 'src/components/PwaRegister.tsx'), 'utf-8');
    expect(pwa).toContain("data?.type !== 'NOTIFICATION_CLICK'");
    expect(pwa).toContain('syncBadgeFromStorage');
    expect(pwa).not.toContain('navigateWithoutViewTransition');
    expect(pwa).not.toContain('router.push');
  });

  test('PwaShellSync updates theme-color when resolved theme changes', () => {
    const sync = readFileSync(resolve(ROOT, 'src/components/PwaShellSync.tsx'), 'utf-8');
    expect(sync).toContain('useTheme');
    expect(sync).toContain('theme-color');
    expect(sync).toContain('resolvePwaThemeColor');
    expect(sync).toContain('PWA_IOS_CLASS');
    expect(sync).toContain('isIosWebKit');
    expect(sync).toContain('PWA_ANDROID_CLASS');
    expect(sync).toContain('isAndroidWebKit');
  });
});
