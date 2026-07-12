/** Client-side Web Push subscription helpers (browser only). */

import type { NotificationPreferences } from '@/lib/notification-types';
import { loadNotificationPreferences } from '@/lib/notification-preferences';
import { getClientSessionId } from '@/lib/client-session';
import {
  getNotificationPermissionState,
  isBenignPushRegistrationError,
  isPushManagerSupported,
  requestNotificationPermission,
} from '@/lib/pwa-notification-bridge';
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/app/actions/push-actions';
import { getSupabaseAccessToken } from '@/lib/supabase-session';

let activePushSubscription: PushSubscription | null = null;
let lastPushRegistrationError: string | null = null;

/** iOS / iPadOS Web Push requires a user gesture to create a new subscription. */
export function requiresUserGestureForPushSubscribe(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function getLastPushRegistrationError(): string | null {
  return lastPushRegistrationError;
}

export function formatPushRegistrationError(code: string, isTh: boolean): string {
  const messages: Record<string, { th: string; en: string }> = {
    pin_session_required: {
      th: 'เซสชันหมดอายุ — ออกจากระบบแล้วเข้าใหม่ด้วย PIN',
      en: 'Session expired — sign out and sign in again with PIN',
    },
    supabase_session_missing: {
      th: 'ไม่สามารถเชื่อมต่อเซสชันได้ — ลองออกเข้าใหม่',
      en: 'Could not connect session — try signing out and back in',
    },
    permission_denied: {
      th: 'การแจ้งเตือนถูกปิด — เปิดได้ในการตั้งค่าอุปกรณ์',
      en: 'Notifications blocked — enable them in device settings',
    },
    push_unavailable: {
      th: 'บริการ Push ไม่พร้อม — เปิดแอปจากไอคอนหน้าจอโฮม (ไม่ใช่ Safari)',
      en: 'Push unavailable — open the app from the home screen icon (not Safari)',
    },
    gesture_required: {
      th: 'กดปุ่มลงทะเบียนการแจ้งเตือนด้านล่างเพื่อเปิดใช้บน iPhone/iPad',
      en: 'Tap Register notifications below to enable on iPhone/iPad',
    },
  };

  const entry = messages[code];
  if (entry) return isTh ? entry.th : entry.en;
  return isTh ? `ลงทะเบียนไม่สำเร็จ (${code})` : `Registration failed (${code})`;
}

/** Debounce window — merges resume / focus / pageshow bursts on mobile. */
const MAINTENANCE_DEBOUNCE_MS = 2_000;
/** Retry when Supabase session is not ready yet after PIN unlock. */
const MAINTENANCE_RETRY_MS = [0, 3_000, 8_000] as const;

let maintenanceTimer: ReturnType<typeof setTimeout> | null = null;
let maintenanceGeneration = 0;

async function runPushSubscriptionMaintenance(locale: string): Promise<void> {
  const generation = ++maintenanceGeneration;
  const prefs = loadNotificationPreferences();
  if (!wantsPushRegistration(prefs)) {
    activePushSubscription = null;
    return;
  }

  for (let attempt = 0; attempt < MAINTENANCE_RETRY_MS.length; attempt += 1) {
    if (generation !== maintenanceGeneration) return;
    const delay = MAINTENANCE_RETRY_MS[attempt];
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (generation !== maintenanceGeneration) return;
    const ok = await ensurePushSubscription(locale);
    if (ok) return;
  }
}

/**
 * Re-validates Web Push subscription with the server (debounced).
 * Call on app resume, PIN auth, and preference changes so mobile PWAs
 * recover after OS sleep or expired browser push endpoints.
 */
export function schedulePushSubscriptionMaintenance(locale: string): void {
  if (typeof window === 'undefined') return;
  if (maintenanceTimer) clearTimeout(maintenanceTimer);
  maintenanceTimer = setTimeout(() => {
    maintenanceTimer = null;
    void runPushSubscriptionMaintenance(locale);
  }, MAINTENANCE_DEBOUNCE_MS);
}

export function hasActivePushSubscription(): boolean {
  return activePushSubscription !== null;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function hasMatchingApplicationServerKey(
  subscription: PushSubscription,
  vapidPublicKey: string,
): boolean {
  const existingKey = subscription.options?.applicationServerKey;
  // Safari / iOS PWAs often omit applicationServerKey — do not treat as stale.
  if (!existingKey) return true;

  const expected = urlBase64ToUint8Array(vapidPublicKey);
  const current = new Uint8Array(existingKey);
  if (current.byteLength !== expected.byteLength) return false;

  for (let i = 0; i < current.byteLength; i += 1) {
    if (current[i] !== expected[i]) return false;
  }
  return true;
}

function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return key && key.length > 0 ? key : null;
}

function subscriptionToPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const keys = json.keys;
  if (!json.endpoint || !keys?.p256dh || !keys?.auth) {
    return null;
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

async function getAccessToken(): Promise<string | null> {
  return getSupabaseAccessToken();
}

function logPushClientIssue(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (isBenignPushRegistrationError(error)) {
    console.warn(`[push-subscription] ${context}:`, message);
    return;
  }
  console.error(`[push-subscription] ${context}:`, error);
}

export function wantsPushRegistration(prefs: NotificationPreferences): boolean {
  if (!prefs.enabled) return false;
  return prefs.systemNotifications || prefs.dailyScheduleReports;
}

export type OsNotificationDeferContext = {
  pushSupported?: boolean;
  permission?: 'default' | 'granted' | 'denied' | 'unsupported';
  hasSubscription?: boolean;
  userAgent?: string;
};

/**
 * When Web Push is active, the service worker owns OS banners so foreground
 * Supabase realtime does not duplicate alerts on Android/iOS PWAs.
 * iOS still needs realtime OS banners until the user completes gesture subscribe.
 */
export function shouldDeferOsNotificationToPush(
  prefs: NotificationPreferences,
  context: OsNotificationDeferContext = {},
): boolean {
  if (!wantsPushRegistration(prefs)) return false;

  const pushSupported = context.pushSupported ?? isPushManagerSupported();
  if (!pushSupported) return false;

  const permission = context.permission ?? getNotificationPermissionState();
  if (permission !== 'granted') return false;

  const userAgent = context.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const hasSubscription = context.hasSubscription ?? hasActivePushSubscription();

  if (requiresUserGestureForPushSubscribe(userAgent)) {
    return hasSubscription === true;
  }

  return hasSubscription === true;
}

function setPushRegistrationError(code: string | null): void {
  lastPushRegistrationError = code;
}

export async function ensurePushSubscription(locale: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isPushManagerSupported()) {
    setPushRegistrationError('push_unavailable');
    return false;
  }
  if (!getVapidPublicKey()) {
    setPushRegistrationError('vapid_not_configured');
    return false;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    setPushRegistrationError(permission === 'denied' ? 'permission_denied' : 'permission_denied');
    return false;
  }

  const prefs = loadNotificationPreferences();
  if (!wantsPushRegistration(prefs)) {
    setPushRegistrationError(null);
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = getVapidPublicKey()!;
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setPushRegistrationError('supabase_session_missing');
      return false;
    }

    let existing = await registration.pushManager.getSubscription();
    if (existing && !hasMatchingApplicationServerKey(existing, vapidKey)) {
      await unregisterPushSubscription({ accessToken, endpoint: existing.endpoint });
      await existing.unsubscribe();
      existing = null;
    }

    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      }));

    const payload = subscriptionToPayload(subscription);
    if (!payload) {
      setPushRegistrationError('invalid_subscription');
      return false;
    }

    const result = await registerPushSubscription({
      accessToken,
      ...payload,
      clientSessionId: getClientSessionId(),
      prefs,
      locale,
      userAgent: navigator.userAgent,
    });

    if (result.success) {
      activePushSubscription = subscription;
      setPushRegistrationError(null);
      return true;
    }
    setPushRegistrationError(result.error);
    console.warn('[push-subscription] server register failed:', result.error);
    return false;
  } catch (error) {
    if (isBenignPushRegistrationError(error)) {
      setPushRegistrationError('push_unavailable');
    } else {
      setPushRegistrationError('ensure_failed');
    }
    logPushClientIssue('ensure failed', error);
    return false;
  }
}

/** Call directly from a button/toggle click — required for first-time iOS Web Push. */
export async function ensurePushSubscriptionFromUserGesture(locale: string): Promise<boolean> {
  return ensurePushSubscription(locale);
}

export async function removePushSubscription(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      const accessToken = await getAccessToken();
      if (accessToken) {
        await unregisterPushSubscription({ accessToken, endpoint });
      }
      await subscription.unsubscribe();
    }
  } catch (error) {
    logPushClientIssue('remove failed', error);
  } finally {
    activePushSubscription = null;
  }
}

export async function syncPushPrefsToServer(
  prefs: NotificationPreferences,
  locale: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  if (!prefs.enabled || !wantsPushRegistration(prefs)) {
    await removePushSubscription();
    return;
  }

  if (getNotificationPermissionState() !== 'granted') {
    if (requiresUserGestureForPushSubscribe()) {
      setPushRegistrationError('gesture_required');
      return;
    }
    await ensurePushSubscription(locale);
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const vapidKey = getVapidPublicKey();
    if (!subscription || !vapidKey || !hasMatchingApplicationServerKey(subscription, vapidKey)) {
      if (requiresUserGestureForPushSubscribe()) {
        setPushRegistrationError('gesture_required');
        return;
      }
      await ensurePushSubscription(locale);
      return;
    }

    activePushSubscription = subscription;
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const payload = subscriptionToPayload(subscription);
    if (!payload) return;

    await registerPushSubscription({
      accessToken,
      ...payload,
      clientSessionId: getClientSessionId(),
      prefs,
      locale,
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    logPushClientIssue('sync prefs failed', error);
  }
}

export async function refreshPushSubscriptionState(locale: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const prefs = loadNotificationPreferences();
  if (!prefs.enabled || !wantsPushRegistration(prefs)) {
    activePushSubscription = null;
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    activePushSubscription = subscription;
    if (subscription) {
      await syncPushPrefsToServer(prefs, locale);
    } else if (!requiresUserGestureForPushSubscribe()) {
      await ensurePushSubscription(locale);
    } else {
      setPushRegistrationError('gesture_required');
    }
  } catch {
    activePushSubscription = null;
  }
}

export async function refreshLocalPushSubscriptionState(): Promise<boolean> {
  if (typeof window === 'undefined' || !isPushManagerSupported()) {
    activePushSubscription = null;
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    activePushSubscription = subscription;
    return subscription !== null;
  } catch {
    activePushSubscription = null;
    return false;
  }
}
