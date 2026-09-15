/** Client-side Web Push subscription helpers (browser only). */

import type { NotificationPreferences } from '@/lib/notification-types';
import { loadNotificationPreferences } from '@/lib/notification-preferences';
import { getClientSessionId } from '@/lib/client-session';
import {
  getNotificationPermissionState,
  isBenignPushRegistrationError,
  isPushManagerSupported,
} from '@/lib/pwa-notification-bridge';
import {
  registerPushSubscription,
  unregisterPushSubscription,
} from '@/app/actions/push-actions';
import { ensureSupabaseSession, getSupabaseAccessToken } from '@/lib/supabase-session';
import {
  extractPushSubscriptionPayload,
  type PushSubscriptionRegisterPayload,
} from '@/lib/push-subscription-payload';
import { verifyDevicePushRegistration } from '@/app/actions/push-actions';
import { ensurePushServiceWorkerReady } from '@/lib/pwa-update';

let localPushSubscription: PushSubscription | null = null;
let serverPushRegistrationConfirmed = false;
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
      th: 'เซสชันหมดอายุ ออกจากระบบแล้วเข้าใหม่ด้วย PIN',
      en: 'Session expired sign out and sign in again with PIN',
    },
    supabase_session_missing: {
      th: 'ไม่สามารถเชื่อมต่อเซสชันได้ ลองออกเข้าใหม่',
      en: 'Could not connect session try signing out and back in',
    },
    permission_denied: {
      th: 'การแจ้งเตือนถูกปิด เปิดได้ในการตั้งค่าอุปกรณ์',
      en: 'Notifications blocked enable them in device settings',
    },
    push_unavailable: {
      th: 'บริการ Push ไม่พร้อม เปิดแอปจากไอคอนหน้าจอโฮม (ไม่ใช่ Safari)',
      en: 'Push unavailable open the app from the home screen icon (not Safari)',
    },
    gesture_required: {
      th: 'กดปุ่มลงทะเบียนการแจ้งเตือนด้านล่างเพื่อเปิดใช้บน iPhone/iPad',
      en: 'Tap Register notifications below to enable on iPhone/iPad',
    },
    server_not_registered: {
      th: 'เครื่องนี้ยังไม่ได้ลงทะเบียนกับเซิร์ฟเวอร์ กดปุ่มลงทะเบียนอีกครั้ง',
      en: 'This device is not registered with the server tap Register again',
    },
  };

  const entry = messages[code];
  if (entry) return isTh ? entry.th : entry.en;
  return isTh ? `ลงทะเบียนไม่สำเร็จ (${code})` : `Registration failed (${code})`;
}

/** Debounce window merges resume / focus / pageshow bursts on mobile. */
const MAINTENANCE_DEBOUNCE_MS = 120;
/** Retry when Supabase / PIN cookies are not ready yet after unlock. */
const MAINTENANCE_RETRY_MS = [0, 250, 700, 1_500] as const;
const AUTH_SESSION_POLL_MS = 150;
const AUTH_SESSION_POLL_MAX = 24;

let maintenanceTimer: ReturnType<typeof setTimeout> | null = null;
let maintenanceInFlight: Promise<void> | null = null;

export const PUSH_REGISTRATION_UPDATED_EVENT = 'bb-push-registration-updated';

function dispatchPushRegistrationUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PUSH_REGISTRATION_UPDATED_EVENT));
}

async function waitForAuthenticatedPushPrerequisites(): Promise<boolean> {
  const { getAuthSessionInfo } = await import('@/app/actions/auth');

  for (let attempt = 0; attempt < AUTH_SESSION_POLL_MAX; attempt += 1) {
    const [supabaseReady, pinSession] = await Promise.all([
      ensureSupabaseSession(),
      getAuthSessionInfo(),
    ]);
    if (supabaseReady && pinSession.verified) {
      return true;
    }
    if (attempt < AUTH_SESSION_POLL_MAX - 1) {
      await new Promise((resolve) => setTimeout(resolve, AUTH_SESSION_POLL_MS));
    }
  }

  return false;
}

/**
 * Register (or re-sync) Web Push after PIN / passkey auth.
 * Use `fromUserGesture: true` from PIN / passkey handlers so iOS can subscribe.
 */
export async function registerPushAfterAuthentication(
  locale: string,
  options: { fromUserGesture?: boolean } = {},
): Promise<boolean> {
  const prefs = loadNotificationPreferences();
  if (!wantsPushRegistration(prefs)) {
    setPushRegistrationError(null);
    return false;
  }

  warmPushRegistrationStack();
  await waitForAuthenticatedPushPrerequisites();

  const ok = await ensurePushSubscription(locale, {
    fromUserGesture: options.fromUserGesture === true,
  });
  const reconciled = await reconcileDevicePushRegistration(locale, {
    fromUserGesture: options.fromUserGesture === true,
  });
  if (!ok && reconciled !== 'server') {
    schedulePushSubscriptionMaintenance(locale, { immediate: true });
  }
  return ok || reconciled === 'server';
}

function queuePushSubscriptionMaintenance(locale: string): void {
  if (maintenanceInFlight) return;
  maintenanceInFlight = runPushSubscriptionMaintenance(locale).finally(() => {
    maintenanceInFlight = null;
  });
}

async function runPushSubscriptionMaintenance(locale: string): Promise<void> {
  const prefs = loadNotificationPreferences();
  if (!wantsPushRegistration(prefs)) {
    localPushSubscription = null;
    serverPushRegistrationConfirmed = false;
    return;
  }

  for (let attempt = 0; attempt < MAINTENANCE_RETRY_MS.length; attempt += 1) {
    const delay = MAINTENANCE_RETRY_MS[attempt];
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (!wantsPushRegistration(loadNotificationPreferences())) {
      return;
    }

    await waitForAuthenticatedPushPrerequisites();

    const ok = await ensurePushSubscription(locale);
    if (ok) return;
  }
}

/**
 * Re-validates Web Push subscription with the server (debounced).
 * Call on app resume, PIN auth, and preference changes so mobile PWAs
 * recover after OS sleep or expired browser push endpoints.
 */
export function schedulePushSubscriptionMaintenance(
  locale: string,
  options?: { immediate?: boolean },
): void {
  if (typeof window === 'undefined') return;
  if (options?.immediate) {
    if (maintenanceTimer) clearTimeout(maintenanceTimer);
    maintenanceTimer = null;
    queuePushSubscriptionMaintenance(locale);
    return;
  }
  if (maintenanceTimer) clearTimeout(maintenanceTimer);
  maintenanceTimer = setTimeout(() => {
    maintenanceTimer = null;
    queuePushSubscriptionMaintenance(locale);
  }, MAINTENANCE_DEBOUNCE_MS);
}

/** Start SW + session work before a user-gesture subscribe (Settings, iOS banner). */
export function warmPushRegistrationStack(): void {
  if (typeof window === 'undefined') return;
  const prefs = loadNotificationPreferences();
  if (!wantsPushRegistration(prefs)) return;
  void ensurePushServiceWorkerReady().catch(() => undefined);
  void ensureSupabaseSession().catch(() => undefined);
}

/** True after the server acknowledged this device's push endpoint. */
export function hasServerPushRegistration(): boolean {
  return serverPushRegistrationConfirmed;
}

/** @deprecated Prefer hasServerPushRegistration for delivery gating. */
export function hasActivePushSubscription(): boolean {
  return serverPushRegistrationConfirmed;
}

export function getLocalPushSubscriptionEndpoint(): string | null {
  return localPushSubscription?.endpoint ?? null;
}

export function hasLocalPushSubscription(): boolean {
  return localPushSubscription !== null;
}

export async function verifyServerPushRegistration(endpoint?: string | null): Promise<boolean> {
  const target = endpoint ?? getLocalPushSubscriptionEndpoint();
  if (!target) {
    serverPushRegistrationConfirmed = false;
    return false;
  }

  try {
    const result = await verifyDevicePushRegistration(target);
    const wasConfirmed = serverPushRegistrationConfirmed;
    serverPushRegistrationConfirmed = result.registered;
    if (result.registered && !wasConfirmed) {
      dispatchPushRegistrationUpdated();
    }
    return result.registered;
  } catch {
    serverPushRegistrationConfirmed = false;
    return false;
  }
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
  // Safari / iOS PWAs often omit applicationServerKey do not treat as stale.
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

function subscriptionToPayload(subscription: PushSubscription): PushSubscriptionRegisterPayload | null {
  return extractPushSubscriptionPayload(subscription);
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
  if (prefs.dailyScheduleReports || prefs.proactiveInsights || prefs.securityAlerts) {
    return true;
  }
  return prefs.enabled && prefs.systemNotifications;
}

export type OsNotificationDeferContext = {
  pushSupported?: boolean;
  permission?: 'default' | 'granted' | 'denied' | 'unsupported';
  hasSubscription?: boolean;
  hasServerRegistration?: boolean;
  userAgent?: string;
  /** When true, realtime should show OS banners immediately (push may not surface on mobile). */
  appInForeground?: boolean;
};

/** True when the PWA tab is visible OS banners should come from realtime, not deferred push. */
export function isAppInForeground(): boolean {
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'visible';
}

/**
 * When Web Push is active and the app is in the background, the service worker owns
 * OS banners so foreground Supabase realtime does not duplicate alerts.
 * Foreground mobile PWAs must not defer push often fails to surface banners while
 * the app is open (LINE/TikTok-style heads-up still comes from the live session).
 * Only defer after the server has the endpoint a local-only iOS subscription
 * must not suppress realtime banners when delivery cannot work.
 */
export function shouldDeferOsNotificationToPush(
  prefs: NotificationPreferences,
  context: OsNotificationDeferContext = {},
): boolean {
  if (!wantsPushRegistration(prefs)) return false;

  const appInForeground = context.appInForeground ?? isAppInForeground();
  if (appInForeground) return false;

  const pushSupported = context.pushSupported ?? isPushManagerSupported();
  if (!pushSupported) return false;

  const permission = context.permission ?? getNotificationPermissionState();
  if (permission !== 'granted') return false;

  const hasServerRegistration =
    context.hasServerRegistration ?? hasServerPushRegistration();
  if (!hasServerRegistration) return false;

  const userAgent = context.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const hasSubscription = context.hasSubscription ?? hasLocalPushSubscription();

  if (requiresUserGestureForPushSubscribe(userAgent)) {
    return hasServerRegistration === true && hasSubscription === true;
  }

  return hasServerRegistration === true;
}

function setPushRegistrationError(code: string | null): void {
  lastPushRegistrationError = code;
}

function markServerRegistrationConfirmed(subscription: PushSubscription | null): void {
  const wasConfirmed = serverPushRegistrationConfirmed;
  localPushSubscription = subscription;
  serverPushRegistrationConfirmed = subscription !== null;
  if (subscription && !wasConfirmed) {
    dispatchPushRegistrationUpdated();
  }
}

async function ensureNotificationPermissionGranted(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function registerSubscriptionWithServer(
  subscription: PushSubscription,
  accessToken: string,
  prefs: NotificationPreferences,
  locale: string,
): Promise<boolean> {
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
    markServerRegistrationConfirmed(subscription);
    setPushRegistrationError(null);
    return true;
  }

  setPushRegistrationError(result.error);
  console.warn('[push-subscription] server register failed:', result.error);
  return false;
}

async function syncExistingSubscriptionToServer(
  subscription: PushSubscription,
  prefs: NotificationPreferences,
  locale: string,
): Promise<boolean> {
  localPushSubscription = subscription;
  const accessToken = await getSupabaseAccessToken();
  if (!accessToken) {
    setPushRegistrationError('supabase_session_missing');
    return false;
  }
  return registerSubscriptionWithServer(subscription, accessToken, prefs, locale);
}

export async function ensurePushSubscription(
  locale: string,
  options: { fromUserGesture?: boolean } = {},
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isPushManagerSupported()) {
    setPushRegistrationError('push_unavailable');
    return false;
  }
  if (!getVapidPublicKey()) {
    setPushRegistrationError('vapid_not_configured');
    return false;
  }

  const prefs = loadNotificationPreferences();
  if (!wantsPushRegistration(prefs)) {
    setPushRegistrationError(null);
    return false;
  }

  const fromUserGesture = options.fromUserGesture === true;
  const registrationPromise = ensurePushServiceWorkerReady();
  const sessionPromise = ensureSupabaseSession();
  const permissionPromise = ensureNotificationPermissionGranted();

  try {
    if (!(await permissionPromise)) {
      setPushRegistrationError('permission_denied');
      return false;
    }

    const registration = await registrationPromise;
    const vapidKey = getVapidPublicKey()!;
    let existing = await registration.pushManager.getSubscription();

    if (!existing && requiresUserGestureForPushSubscribe() && !fromUserGesture) {
      setPushRegistrationError('gesture_required');
      return false;
    }

    if (!existing) {
      const sessionOk = await sessionPromise;
      if (!sessionOk) {
        setPushRegistrationError('supabase_session_missing');
        return false;
      }
    }

    const accessToken = await getSupabaseAccessToken();
    if (!accessToken) {
      setPushRegistrationError('supabase_session_missing');
      return false;
    }

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

    localPushSubscription = subscription;
    return registerSubscriptionWithServer(subscription, accessToken, prefs, locale);
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

/** Call directly from a button/toggle click required for first-time iOS Web Push. */
export async function ensurePushSubscriptionFromUserGesture(locale: string): Promise<boolean> {
  return ensurePushSubscription(locale, { fromUserGesture: true });
}

export async function removePushSubscription(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const registration = await ensurePushServiceWorkerReady();
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      const accessToken = await getSupabaseAccessToken();
      if (accessToken) {
        await unregisterPushSubscription({ accessToken, endpoint });
      }
      await subscription.unsubscribe();
    }
  } catch (error) {
    logPushClientIssue('remove failed', error);
  } finally {
    localPushSubscription = null;
    serverPushRegistrationConfirmed = false;
  }
}

export async function syncPushPrefsToServer(
  prefs: NotificationPreferences,
  locale: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  if (!wantsPushRegistration(prefs)) {
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
    const registration = await ensurePushServiceWorkerReady();
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

    await syncExistingSubscriptionToServer(subscription, prefs, locale);
  } catch (error) {
    logPushClientIssue('sync prefs failed', error);
  }
}

export type DevicePushRegistrationState = 'server' | 'local_only' | 'none';

/**
 * Single source of truth for Settings / iOS banner status.
 * 1) Wait for PIN + Supabase (server actions need bb_auth_pin_verified).
 * 2) Read the browser PushSubscription endpoint.
 * 3) Verify endpoint on Supabase before attempting a heavy re-register.
 */
export async function reconcileDevicePushRegistration(
  locale: string,
  options: { fromUserGesture?: boolean } = {},
): Promise<DevicePushRegistrationState> {
  if (typeof window === 'undefined') return 'none';

  const prefs = loadNotificationPreferences();
  if (!wantsPushRegistration(prefs)) {
    localPushSubscription = null;
    serverPushRegistrationConfirmed = false;
    setPushRegistrationError(null);
    return 'none';
  }

  if (!isPushManagerSupported()) {
    setPushRegistrationError('push_unavailable');
    return 'none';
  }

  await waitForAuthenticatedPushPrerequisites();

  try {
    const registration = await ensurePushServiceWorkerReady();
    const subscription = await registration.pushManager.getSubscription();
    localPushSubscription = subscription;

    if (subscription) {
      if (serverPushRegistrationConfirmed) {
        setPushRegistrationError(null);
        return 'server';
      }

      const verified = await verifyServerPushRegistration(subscription.endpoint);
      if (verified) {
        setPushRegistrationError(null);
        return 'server';
      }

      const synced = await syncExistingSubscriptionToServer(subscription, prefs, locale);
      if (synced) {
        setPushRegistrationError(null);
        return 'server';
      }

      setPushRegistrationError('server_not_registered');
      return 'local_only';
    }

    serverPushRegistrationConfirmed = false;

    if (getNotificationPermissionState() !== 'granted') {
      setPushRegistrationError('permission_denied');
      return 'none';
    }

    if (requiresUserGestureForPushSubscribe() && !options.fromUserGesture) {
      setPushRegistrationError('gesture_required');
      return 'none';
    }

    const ok = await ensurePushSubscription(locale, {
      fromUserGesture: options.fromUserGesture === true,
    });
    if (ok) {
      setPushRegistrationError(null);
      return 'server';
    }

    return 'none';
  } catch (error) {
    logPushClientIssue('reconcile failed', error);
    localPushSubscription = null;
    serverPushRegistrationConfirmed = false;
    return 'none';
  }
}

export async function refreshPushSubscriptionState(locale: string): Promise<void> {
  await reconcileDevicePushRegistration(locale);
}

export async function refreshLocalPushSubscriptionState(): Promise<boolean> {
  if (typeof window === 'undefined' || !isPushManagerSupported()) {
    localPushSubscription = null;
    serverPushRegistrationConfirmed = false;
    return false;
  }

  try {
    const registration = await ensurePushServiceWorkerReady();
    const subscription = await registration.pushManager.getSubscription();
    localPushSubscription = subscription;
    if (!subscription) {
      serverPushRegistrationConfirmed = false;
      return false;
    }

    if (!serverPushRegistrationConfirmed) {
      await waitForAuthenticatedPushPrerequisites();
      const registered = await verifyServerPushRegistration(subscription.endpoint);
      if (!registered) {
        setPushRegistrationError('server_not_registered');
      } else {
        setPushRegistrationError(null);
      }
    }

    return true;
  } catch {
    localPushSubscription = null;
    serverPushRegistrationConfirmed = false;
    return false;
  }
}
