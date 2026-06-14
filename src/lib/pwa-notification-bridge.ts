/** PWA home-screen badge + system notifications (iOS / Android / desktop). */

export const INVENTORY_NOTIFICATION_EVENT = 'bb-inventory-notification';

/** Square black logo on white — required for OS notification header (wide logo.png renders as a white bar). */
export const PWA_NOTIFICATION_ICON = '/images/notification-icon.png';

/** Vibration pattern for inventory OS notifications (when device supports it). */
export const PWA_NOTIFICATION_VIBRATE = [120, 60, 120] as const;

export type SystemNotificationOptions = NotificationOptions & {
  vibrate?: number | readonly number[];
};

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
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: 'SET_BADGE', count });
}

/** Red numeric badge on home-screen app icon (where supported). */
export async function syncAppBadge(count: number): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const safeCount = Math.max(0, Math.min(99, Math.floor(count)));

  postBadgeToServiceWorker(safeCount);

  try {
    if ('setAppBadge' in navigator) {
      if (safeCount > 0) {
        await (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(
          safeCount
        );
      } else if ('clearAppBadge' in navigator) {
        await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
      }
    }
  } catch {
    // Badge API may reject when not installed to home screen
  }
}

export function buildSystemNotificationOptions(input: {
  body: string;
  tag?: string;
  url?: string;
  enableVibrate?: boolean;
}): SystemNotificationOptions {
  const opts: SystemNotificationOptions = {
    body: input.body,
    icon: PWA_NOTIFICATION_ICON,
    tag: input.tag ?? 'bb-inventory',
    silent: false,
    requireInteraction: false,
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

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) {
      await reg.showNotification(formatted.title, payload);
      return;
    }
  } catch {
    // fall through to Notification constructor
  }

  try {
    const n = new Notification(formatted.title, payload);
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
