/** Home-screen icon badge (iOS / Android / iPad PWA) — numeric red dot like Line/Facebook. */

export const SW_SET_BADGE_MESSAGE = 'SET_BADGE';

export function clampAppBadgeCount(count: number): number {
  return Math.max(0, Math.min(99, Math.floor(Number(count) || 0)));
}

export function canUseAppBadgeApi(
  nav: Navigator | null | undefined = typeof navigator !== 'undefined' ? navigator : null,
): boolean {
  return Boolean(nav && 'setAppBadge' in nav);
}

/** True when launched as installed home-screen PWA (required for iOS badging). */
export function isInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  if (iosStandalone === true) return true;
  return window.matchMedia('(display-mode: standalone)').matches;
}

type BadgeNavigator = Navigator & {
  setAppBadge: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Apply numeric badge on navigator (window or service worker). */
export async function applyAppBadgeCount(
  count: number,
  nav: Navigator | null | undefined = typeof navigator !== 'undefined' ? navigator : null,
): Promise<boolean> {
  if (!canUseAppBadgeApi(nav)) return false;
  const safeCount = clampAppBadgeCount(count);
  const badgeNav = nav as BadgeNavigator;
  try {
    if (safeCount > 0) {
      await badgeNav.setAppBadge(safeCount);
    } else if (badgeNav.clearAppBadge) {
      await badgeNav.clearAppBadge();
    } else {
      await badgeNav.setAppBadge(0);
    }
    return true;
  } catch {
    return false;
  }
}

export async function postBadgeToActiveServiceWorker(count: number): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const safeCount = clampAppBadgeCount(count);
  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: SW_SET_BADGE_MESSAGE, count: safeCount });
  } catch {
    // ignore
  }
}
