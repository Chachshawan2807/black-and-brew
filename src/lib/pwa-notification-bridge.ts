/** PWA home-screen badge + system notifications (iOS / Android / desktop). */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
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

export async function showSystemNotification(
  title: string,
  body: string,
  options?: { tag?: string; url?: string }
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const tag = options?.tag ?? 'bb-inventory';
  const payload = {
    body: body.slice(0, 240),
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag,
    data: { url: options?.url ?? '/th/inventory' },
  };

  try {
    if (navigator.serviceWorker?.controller) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title.slice(0, 120), payload);
      return;
    }
  } catch {
    // fall through to Notification constructor
  }

  try {
    const n = new Notification(title.slice(0, 120), payload);
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
