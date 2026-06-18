/**
 * Single source of truth for PWA + OS notification brand assets.
 * All platforms (Android, iOS, iPad, desktop web) must use these paths.
 */

export const PWA_BRAND_ICON = '/images/notification-icon.png';
export const PWA_BRAND_ICON_512 = '/images/notification-icon-512.png';
export const PWA_NOTIFICATION_BADGE = '/images/notification-badge.png';
export const PWA_APPLE_TOUCH_ICON = '/images/apple-touch-icon.png';
export const PWA_FAVICON = '/images/favicon.png';

export const PWA_MANIFEST_BACKGROUND = '#fdfcf0';
export const PWA_MANIFEST_THEME = '#000000';

export const PWA_NOTIFICATION_VIBRATE = [120, 60, 120] as const;

/** @deprecated Use PWA_BRAND_ICON — kept for existing imports. */
export const PWA_NOTIFICATION_ICON = PWA_BRAND_ICON;

export function resolvePwaSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  );
}

export function resolvePwaAssetUrl(assetPath: string, origin?: string): string {
  if (origin) {
    return new URL(assetPath, origin).href;
  }
  if (typeof window !== 'undefined') {
    return new URL(assetPath, window.location.origin).href;
  }
  const base = resolvePwaSiteOrigin();
  return base ? new URL(assetPath, base).href : assetPath;
}

export type OsNotificationOptions = NotificationOptions & {
  vibrate?: number | readonly number[];
  /** Re-alert when a notification with the same tag is shown again (supported in Chromium). */
  renotify?: boolean;
};

/** Shared notification options — Android badge uses a dedicated transparent mask. */
export function buildOsNotificationOptions(input: {
  body: string;
  tag?: string;
  url?: string;
  enableVibrate?: boolean;
  origin?: string;
}): OsNotificationOptions {
  const brandIcon = resolvePwaAssetUrl(PWA_BRAND_ICON, input.origin);
  const notificationBadge = resolvePwaAssetUrl(PWA_NOTIFICATION_BADGE, input.origin);

  const opts: OsNotificationOptions = {
    body: input.body,
    icon: brandIcon,
    badge: notificationBadge,
    tag: input.tag ?? 'bb-inventory',
    silent: false,
    requireInteraction: false,
    renotify: true,
    data: { url: input.url ?? '/th/inventory' },
  };

  if (
    input.enableVibrate &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator
  ) {
    opts.vibrate = [...PWA_NOTIFICATION_VIBRATE];
  }

  return opts;
}
