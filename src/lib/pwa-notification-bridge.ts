/** PWA home-screen badge + system notifications (iOS / Android / desktop). */

import {
  buildIosSafeNotificationOptions,
  buildOsNotificationOptions,
  isIosWebPushClient,
  type OsNotificationOptions,
} from '@/lib/pwa-assets';
import {
  applyAppBadgeCount,
  postBadgeToActiveServiceWorker,
} from '@/lib/pwa-app-badge';

export {
  PWA_BRAND_ICON,
  PWA_NOTIFICATION_BADGE,
  PWA_NOTIFICATION_ICON,
  PWA_NOTIFICATION_VIBRATE,
  buildOsNotificationOptions,
  resolvePwaAssetUrl,
} from '@/lib/pwa-assets';

export const INVENTORY_NOTIFICATION_EVENT = 'bb-inventory-notification';
export const SW_INVENTORY_PUSH_RECEIVED = 'INVENTORY_PUSH_RECEIVED';

export type SystemNotificationOptions = OsNotificationOptions;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function canRegisterServiceWorker(): boolean {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
  return (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/** True when the browser exposes PushManager (some dev/embed contexts do not). */
export function isPushManagerSupported(): boolean {
  if (!canRegisterServiceWorker()) return false;
  return typeof window !== 'undefined' && 'PushManager' in window;
}

export function isBenignPushRegistrationError(error: unknown): boolean {
  if (!error) return false;
  const name =
    error instanceof DOMException
      ? error.name
      : typeof error === 'object' && error !== null && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
  const message = error instanceof Error ? error.message : String(error);
  if (name === 'AbortError') return true;
  if (/push service not available/i.test(message)) return true;
  if (/registration failed/i.test(message)) return true;
  return false;
}

/** OS banner title/body with optional unread count prefix. */
export function buildInventoryOsNotification(
  title: string,
  summary: string,
  unreadCount: number,
  isTh: boolean,
): { title: string; body: string } {
  const countPrefix =
    unreadCount > 1
      ? isTh
        ? `[${unreadCount}] `
        : `[${unreadCount}] `
      : '';
  return {
    title: title.slice(0, 120),
    body: `${countPrefix}${summary}`.slice(0, 240),
  };
}

export function dispatchInventoryNotificationEvent(unreadCount: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(INVENTORY_NOTIFICATION_EVENT, { detail: { unreadCount } }),
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'denied';
  }
}

function postBadgeToServiceWorker(count: number): void {
  void postBadgeToActiveServiceWorker(count);
}

/** Red numeric badge on home-screen app icon (iOS / Android / iPad PWA). */
export async function syncAppBadge(count: number): Promise<void> {
  postBadgeToServiceWorker(count);
  await applyAppBadgeCount(count);
}

export function buildSystemNotificationOptions(input: {
  body: string;
  tag?: string;
  url?: string;
  enableVibrate?: boolean;
}): SystemNotificationOptions {
  return buildOsNotificationOptions(input);
}

export async function showSystemNotification(
  title: string,
  body: string,
  options?: { tag?: string; url?: string; unreadCount?: number; isTh?: boolean }
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const formatted = buildInventoryOsNotification(
    title,
    body,
    options?.unreadCount ?? 1,
    options?.isTh ?? true,
  );

  const payload = buildSystemNotificationOptions({
    body: formatted.body,
    tag: options?.tag,
    url: options?.url,
    enableVibrate: true,
  });
  const iosSafePayload = isIosWebPushClient()
    ? buildIosSafeNotificationOptions(payload)
    : payload;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) {
      await reg.showNotification(formatted.title, iosSafePayload);
      return;
    }
  } catch {
    if (!isIosWebPushClient()) {
      try {
        const reg = await navigator.serviceWorker?.ready;
        if (reg?.showNotification) {
          await reg.showNotification(
            formatted.title,
            buildIosSafeNotificationOptions(payload),
          );
          return;
        }
      } catch {
        // fall through to Notification constructor
      }
    }
  }

  try {
    const n = new Notification(formatted.title, iosSafePayload);
    n.onclick = () => {
      window.focus();
      if (options?.url) window.location.href = options.url;
      n.close();
    };
  } catch {
    // ignore — e.g. iOS without PWA install
  }
}

export function isUuidString(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}
