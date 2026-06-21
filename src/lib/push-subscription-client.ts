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
  syncPushSubscriptionPrefs,
  unregisterPushSubscription,
} from '@/app/actions/push-actions';
import { getSupabaseAccessToken } from '@/lib/supabase-session';

let activePushSubscription: PushSubscription | null = null;

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
  const existingKey = subscription.options.applicationServerKey;
  if (!existingKey) return false;

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

export async function ensurePushSubscription(locale: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isPushManagerSupported()) return false;
  if (!getVapidPublicKey()) return false;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return false;

  const prefs = loadNotificationPreferences();
  if (!wantsPushRegistration(prefs)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = getVapidPublicKey()!;
    const accessToken = await getAccessToken();
    if (!accessToken) return false;

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
    if (!payload) return false;

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
      return true;
    }
    console.warn('[push-subscription] server register failed:', result.error);
    return false;
  } catch (error) {
    logPushClientIssue('ensure failed', error);
    return false;
  }
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
    await ensurePushSubscription(locale);
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const vapidKey = getVapidPublicKey();
    if (!subscription || !vapidKey || !hasMatchingApplicationServerKey(subscription, vapidKey)) {
      await ensurePushSubscription(locale);
      return;
    }

    activePushSubscription = subscription;
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    await syncPushSubscriptionPrefs({
      accessToken,
      endpoint: subscription.endpoint,
      prefs,
      locale,
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
    } else {
      await ensurePushSubscription(locale);
    }
  } catch {
    activePushSubscription = null;
  }
}
