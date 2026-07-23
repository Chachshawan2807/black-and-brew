/**
 * Single source of truth for PWA + OS notification brand assets.
 * All platforms (Android, iOS, iPad, desktop web) must use these paths.
 */

export const PWA_BRAND_ICON = '/images/notification-icon.png';
export const PWA_BRAND_ICON_512 = '/images/notification-icon-512.png';
/** Full-color brand mark on transparent canvas — Android/iOS Web Push body icon. */
export const PWA_PUSH_NOTIFICATION_ICON = '/images/push-notification-icon.png';
export const PWA_MASKABLE_ICON = '/images/maskable-icon-512.png';
export const PWA_NOTIFICATION_BADGE = '/images/notification-badge.png';
export const PWA_APPLE_TOUCH_ICON = '/images/apple-touch-icon.png';
export const PWA_FAVICON = '/images/favicon.png';

export const PWA_MANIFEST_BACKGROUND = '#f7f5e8';
export const PWA_MANIFEST_THEME = '#000000';

export const PWA_NOTIFICATION_VIBRATE = [120, 60, 120] as const;

/** @deprecated Use PWA_PUSH_NOTIFICATION_ICON — kept for existing imports. */
export const PWA_NOTIFICATION_ICON = PWA_PUSH_NOTIFICATION_ICON;

/** Relative asset paths embedded in Web Push payloads; SW resolves to absolute URLs. */
export interface PwaNotificationAssetPaths {
  /** Large color icon — notification body (right side on Android). */
  icon: string;
  /** Monochrome alpha-mask badge — status bar / notification header. */
  badge: string;
}

export function buildPwaNotificationAssetPaths(): PwaNotificationAssetPaths {
  return {
    icon: PWA_PUSH_NOTIFICATION_ICON,
    badge: PWA_NOTIFICATION_BADGE,
  };
}

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

/** iOS / iPadOS Web Push (WebKit) ignores or rejects several Chromium-only fields. */
export function isIosWebPushClient(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

const IOS_UNSUPPORTED_NOTIFICATION_KEYS = [
  'vibrate',
  'renotify',
  'badge',
  'requireInteraction',
  'timestamp',
  'silent',
  'actions',
  'image',
] as const;

/** Strip fields that break or are ignored on iOS so banners match Android delivery. */
export function buildIosSafeNotificationOptions<T extends OsNotificationOptions>(options: T): T {
  const safe = { ...options } as T & Record<string, unknown>;
  for (const key of IOS_UNSUPPORTED_NOTIFICATION_KEYS) {
    delete safe[key];
  }
  return safe as T;
}

/** Shared notification options — Android badge uses a dedicated transparent mask. */
export function buildOsNotificationOptions(input: {
  body: string;
  tag?: string;
  url?: string;
  enableVibrate?: boolean;
  origin?: string;
  /** Explicit UA for tests / server-side Apple targeting. */
  userAgent?: string;
}): OsNotificationOptions {
  const pushIcon = resolvePwaAssetUrl(PWA_PUSH_NOTIFICATION_ICON, input.origin);
  const notificationBadge = resolvePwaAssetUrl(PWA_NOTIFICATION_BADGE, input.origin);
  const isIos = isIosWebPushClient(input.userAgent);

  const opts: OsNotificationOptions = {
    body: input.body,
    icon: pushIcon,
    badge: notificationBadge,
    tag: input.tag ?? 'bb-inventory',
    silent: false,
    requireInteraction: false,
    renotify: true,
    data: { url: input.url ?? '/th/inventory' },
  };

  if (
    !isIos &&
    input.enableVibrate &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator
  ) {
    opts.vibrate = [...PWA_NOTIFICATION_VIBRATE];
  }

  return isIos ? buildIosSafeNotificationOptions(opts) : opts;
}
