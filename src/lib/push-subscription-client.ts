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
import {
  clearSupabaseSession,
  ensureSupabaseSession,
  getSupabaseAccessToken,
  refreshSupabaseAccessToken,
} from '@/lib/supabase-session';
import {
  extractPushSubscriptionPayload,
  type PushSubscriptionRegisterPayload,
} from '@/lib/push-subscription-payload';
import { verifyDevicePushRegistration } from '@/app/actions/push-actions';
import { ensurePushServiceWorkerReady } from '@/lib/pwa-update';
import {
  classifyPushRegistrationError,
  isRetryablePushRegisterError,
} from '@/lib/push-registration-errors';
import {
  applicationServerKeysMatch,
  toPushSubscribeOptions,
  vapidApplicationServerKeyCandidates,
  vapidPublicKeyToApplicationServerKey,
} from '@/lib/vapid-public-key';

export { urlBase64ToUint8Array } from '@/lib/vapid-public-key';

let localPushSubscription: PushSubscription | null = null;
let serverPushRegistrationConfirmed = false;
let lastPushRegistrationError: string | null = null;
let lastPushRegistrationDetail: string | null = null;

/** iOS / iPadOS Web Push requires a user gesture to create a new subscription. */
export function requiresUserGestureForPushSubscribe(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

/** Android PWAs can subscribe after PIN without a separate Settings tap. */
export function isAndroidWebPushClient(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  return /Android/i.test(userAgent);
}

export function getLastPushRegistrationError(): string | null {
  return lastPushRegistrationError;
}

export function getLastPushRegistrationDetail(): string | null {
  return lastPushRegistrationDetail;
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
    subscribe_in_progress: {
      th: 'กำลังลงทะเบียนอยู่ กดปุ่มด้านล่างหากยังไม่ขึ้นว่าสำเร็จ',
      en: 'Registration is still running tap Register if it does not finish',
    },
    vapid_key_invalid: {
      th: 'คีย์การแจ้งเตือนของเซิร์ฟเวอร์ไม่ถูกต้อง ติดต่อผู้ดูแลระบบ',
      en: 'Server push key is invalid contact an administrator',
    },
    server_unreachable: {
      th: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ตรวจอินเน็ตแล้วกดลงทะเบียนอีกครั้ง',
      en: 'Could not reach the server check the network and tap Register again',
    },
    ensure_failed: {
      th: 'ลงทะเบียนไม่สำเร็จ กดปุ่มด้านล่างเพื่อลองใหม่',
      en: 'Registration failed tap Register below to retry',
    },
    invalid_subscription: {
      th: 'ข้อมูล Push จากเบราว์เซอร์ไม่ครบ กดลงทะเบียนอีกครั้ง',
      en: 'Browser push data was incomplete tap Register again',
    },
    invalid_payload: {
      th: 'ส่งข้อมูลลงทะเบียนไม่ครบ ลองออกจากระบบแล้วเข้าใหม่',
      en: 'Registration payload was incomplete try signing out and back in',
    },
    supabase_upsert_failed: {
      th: 'บันทึกลงฐานข้อมูลไม่สำเร็จ ลองใหม่หรือติดต่อผู้ดูแล',
      en: 'Could not save registration to the database try again or contact support',
    },
    vapid_not_configured: {
      th: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Push ติดต่อผู้ดูแลระบบ',
      en: 'Push is not configured on the server contact an administrator',
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
/** Android: longer window after PIN while SW + anonymous session settle. */
const ANDROID_PIN_AUTH_RETRY_MS = [0, 250, 700, 1_500, 3_000] as const;
const AUTH_SESSION_POLL_MS = 150;
const AUTH_SESSION_POLL_MAX = 24;

let maintenanceTimer: ReturnType<typeof setTimeout> | null = null;
let maintenanceInFlight: Promise<void> | null = null;
/** Serializes subscribe() Chrome Android throws InvalidStateError on concurrent calls. */
let ensureQueue: Promise<unknown> = Promise.resolve();

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

  const android = isAndroidWebPushClient();
  const fromUserGesture = options.fromUserGesture === true || android;

  warmPushRegistrationStack();
  await refreshSupabaseAccessToken();
  await waitForAuthenticatedPushPrerequisites();

  const retryMs = android ? ANDROID_PIN_AUTH_RETRY_MS : MAINTENANCE_RETRY_MS;

  for (let attempt = 0; attempt < retryMs.length; attempt += 1) {
    const delay = retryMs[attempt];
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (!wantsPushRegistration(loadNotificationPreferences())) {
      return false;
    }

    const ok = await ensurePushSubscription(locale, { fromUserGesture });
    const reconciled = await reconcileDevicePushRegistration(locale, { fromUserGesture });
    if (ok || reconciled === 'server') {
      setPushRegistrationError(null);
      return true;
    }

    if (!android) break;
  }

  schedulePushSubscriptionMaintenance(locale, { immediate: true });
  return hasServerPushRegistration();
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
    if (result.status === 'unauthorized' || result.status === 'error') {
      return false;
    }
    const wasConfirmed = serverPushRegistrationConfirmed;
    serverPushRegistrationConfirmed = result.registered;
    if (result.registered && !wasConfirmed) {
      dispatchPushRegistrationUpdated();
    }
    return result.registered;
  } catch {
    return false;
  }
}

async function inspectServerPushRegistration(
  endpoint: string,
): Promise<'registered' | 'missing' | 'unauthorized' | 'error'> {
  try {
    const result = await verifyDevicePushRegistration(endpoint);
    if (result.status === 'registered') {
      const wasConfirmed = serverPushRegistrationConfirmed;
      serverPushRegistrationConfirmed = true;
      if (!wasConfirmed) dispatchPushRegistrationUpdated();
    }
    return result.status;
  } catch {
    return 'error';
  }
}

export function hasMatchingApplicationServerKey(
  subscription: PushSubscription,
  vapidPublicKey: string,
): boolean {
  const existingKey = subscription.options?.applicationServerKey;
  // Safari / iOS PWAs often omit applicationServerKey do not treat as stale.
  return applicationServerKeysMatch(existingKey, vapidPublicKey);
}

function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
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

function setPushRegistrationError(code: string | null, detail?: unknown): void {
  lastPushRegistrationError = code;
  if (!code) {
    lastPushRegistrationDetail = null;
    return;
  }
  if (detail instanceof Error) {
    lastPushRegistrationDetail = `${detail.name}: ${detail.message}`.slice(0, 160);
  } else if (typeof detail === 'string' && detail.trim()) {
    lastPushRegistrationDetail = detail.trim().slice(0, 160);
  } else {
    lastPushRegistrationDetail = null;
  }
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

type PushRegisterInput = {
  accessToken: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  clientSessionId: string;
  prefs: NotificationPreferences;
  locale: string;
  userAgent: string;
};

type PushRegisterTransportResult = { success: true } | { success: false; error: string };

function classifyHttpPushRegisterStatus(status: number): string {
  if (status === 401 || status === 403) return 'pin_session_required';
  if (status >= 500) return 'server_unreachable';
  if (status === 404) return 'server_unreachable';
  return classifyPushRegistrationError(new Error(`http_${status}`));
}

async function registerPushSubscriptionViaHttp(
  input: PushRegisterInput,
): Promise<PushRegisterTransportResult> {
  const response = await fetch('/api/push/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await response.json().catch(() => null)) as PushRegisterTransportResult | null;
  if (json && typeof json.success === 'boolean') {
    return json;
  }
  return {
    success: false,
    error: classifyHttpPushRegisterStatus(response.status),
  };
}

async function registerPushSubscriptionOnServer(
  input: PushRegisterInput,
): Promise<PushRegisterTransportResult> {
  try {
    const viaHttp = await registerPushSubscriptionViaHttp(input);
    if (viaHttp.success) return viaHttp;
    if (!isRetryablePushRegisterError(viaHttp.error) && viaHttp.error !== 'ensure_failed') {
      return viaHttp;
    }
  } catch (error) {
    logPushClientIssue('http register threw', error);
  }

  const viaAction = await registerPushSubscription(input).catch((error: unknown) => {
    logPushClientIssue('server register threw', error);
    return {
      success: false as const,
      error: classifyPushRegistrationError(error),
    };
  });
  return viaAction;
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

  const input: PushRegisterInput = {
    accessToken,
    ...payload,
    clientSessionId: getClientSessionId(),
    prefs,
    locale,
    userAgent: navigator.userAgent,
  };

  let result = await registerPushSubscriptionOnServer(input);
  if (!result.success && result.error === 'supabase_session_missing') {
    const freshToken = await refreshSupabaseAccessToken();
    if (freshToken && freshToken !== accessToken) {
      result = await registerPushSubscriptionOnServer({ ...input, accessToken: freshToken });
    }
  }
  if (!result.success && result.error === 'supabase_session_missing') {
    await clearSupabaseSession();
    await ensureSupabaseSession();
    const resetToken = await getSupabaseAccessToken();
    if (resetToken) {
      result = await registerPushSubscriptionOnServer({ ...input, accessToken: resetToken });
    }
  }

  if (result.success) {
    markServerRegistrationConfirmed(subscription);
    setPushRegistrationError(null);
    return true;
  }

  const normalizedError =
    result.error === 'Unauthorized: Session missing or invalid'
      ? 'pin_session_required'
      : result.error.includes('duplicate key') || result.error.includes('violates')
        ? 'supabase_upsert_failed'
        : result.error;
  setPushRegistrationError(normalizedError);
  console.warn('[push-subscription] server register failed:', normalizedError);
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

async function dropLocalPushSubscription(subscription: PushSubscription | null): Promise<void> {
  if (!subscription) return;
  try {
    await subscription.unsubscribe();
  } catch (error) {
    logPushClientIssue('unsubscribe stale failed', error);
  }
}

async function recoverLocalPushSubscription(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function subscribePushManager(
  registration: ServiceWorkerRegistration,
  vapidKey: string,
): Promise<PushSubscription> {
  const active =
    registration.active && registration.pushManager
      ? registration
      : await navigator.serviceWorker.ready;
  const recoveredFirst = await recoverLocalPushSubscription(active);
  if (recoveredFirst) return recoveredFirst;

  const keys = vapidApplicationServerKeyCandidates(vapidKey);
  let firstError: unknown;
  for (const applicationServerKey of keys) {
    try {
      return await active.pushManager.subscribe(toPushSubscribeOptions(applicationServerKey));
    } catch (error) {
      firstError = error;
      const recovered = await recoverLocalPushSubscription(active);
      if (recovered) return recovered;
      if (classifyPushRegistrationError(error) === 'subscribe_in_progress') {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const afterWait = await recoverLocalPushSubscription(active);
        if (afterWait) return afterWait;
      }
    }
  }
  throw firstError instanceof Error ? firstError : new Error('subscribe_failed');
}

async function ensurePushSubscriptionUnqueued(
  locale: string,
  options: { fromUserGesture?: boolean } = {},
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isPushManagerSupported()) {
    setPushRegistrationError('push_unavailable');
    return false;
  }

  let vapidKey: string;
  try {
    const configured = getVapidPublicKey();
    if (!configured) {
      setPushRegistrationError('vapid_not_configured');
      return false;
    }
    vapidPublicKeyToApplicationServerKey(configured);
    vapidKey = configured;
  } catch {
    setPushRegistrationError('vapid_key_invalid');
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
    let existing = await recoverLocalPushSubscription(registration);

    if (!existing && requiresUserGestureForPushSubscribe() && !fromUserGesture) {
      setPushRegistrationError('gesture_required');
      return false;
    }

    const sessionOk = await sessionPromise;
    if (!sessionOk) {
      setPushRegistrationError('supabase_session_missing');
      return false;
    }

    const accessToken = await getSupabaseAccessToken();
    if (!accessToken) {
      setPushRegistrationError('supabase_session_missing');
      return false;
    }

    if (existing && !hasMatchingApplicationServerKey(existing, vapidKey)) {
      await unregisterPushSubscription({ accessToken, endpoint: existing.endpoint });
      await dropLocalPushSubscription(existing);
      existing = null;
    }

    if (existing) {
      const status = await inspectServerPushRegistration(existing.endpoint);
      if (status === 'registered') {
        markServerRegistrationConfirmed(existing);
        setPushRegistrationError(null);
        return true;
      }
      if (status === 'unauthorized') {
        setPushRegistrationError('pin_session_required');
        localPushSubscription = existing;
        return false;
      }

      const synced = await registerSubscriptionWithServer(existing, accessToken, prefs, locale);
      if (synced) return true;

      localPushSubscription = existing;
      if (!getLastPushRegistrationError()) {
        setPushRegistrationError('server_not_registered');
      }
      return false;
    }

    const subscription = existing ?? (await subscribePushManager(registration, vapidKey));
    localPushSubscription = subscription;
    return registerSubscriptionWithServer(subscription, accessToken, prefs, locale);
  } catch (error) {
    if (hasServerPushRegistration()) {
      setPushRegistrationError(null);
      return true;
    }
    setPushRegistrationError(classifyPushRegistrationError(error), error);
    logPushClientIssue('ensure failed', error);
    return false;
  }
}

export async function ensurePushSubscription(
  locale: string,
  options: { fromUserGesture?: boolean } = {},
): Promise<boolean> {
  const run = ensureQueue.then(async () => {
    if (hasServerPushRegistration() && localPushSubscription) {
      const status = await inspectServerPushRegistration(localPushSubscription.endpoint);
      if (status === 'registered') {
        setPushRegistrationError(null);
        return true;
      }
      serverPushRegistrationConfirmed = false;
    }
    return ensurePushSubscriptionUnqueued(locale, options);
  });
  ensureQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Call directly from a button/toggle click required for first-time iOS Web Push. */
export async function ensurePushSubscriptionFromUserGesture(locale: string): Promise<boolean> {
  await refreshSupabaseAccessToken();
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

  const authReady = await waitForAuthenticatedPushPrerequisites();
  if (!authReady) {
    const { getAuthSessionInfo } = await import('@/app/actions/auth');
    const pinSession = await getAuthSessionInfo();
    setPushRegistrationError(
      pinSession.verified ? 'supabase_session_missing' : 'pin_session_required',
    );
    return 'none';
  }

  try {
    const registration = await ensurePushServiceWorkerReady();
    const subscription = await recoverLocalPushSubscription(registration);
    localPushSubscription = subscription;

    if (subscription) {
      if (serverPushRegistrationConfirmed) {
        setPushRegistrationError(null);
        return 'server';
      }

      const status = await inspectServerPushRegistration(subscription.endpoint);
      if (status === 'registered') {
        setPushRegistrationError(null);
        return 'server';
      }

      if (status === 'unauthorized') {
        setPushRegistrationError('pin_session_required');
        return 'local_only';
      }

      const synced = await syncExistingSubscriptionToServer(subscription, prefs, locale);
      if (synced) {
        setPushRegistrationError(null);
        return 'server';
      }

      if (!getLastPushRegistrationError()) {
        setPushRegistrationError('server_not_registered');
      }
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

    const recovered = await recoverLocalPushSubscription(registration);
    if (recovered) {
      localPushSubscription = recovered;
      if (!getLastPushRegistrationError()) {
        setPushRegistrationError('server_not_registered');
      }
      return 'local_only';
    }

    if (!getLastPushRegistrationError()) {
      setPushRegistrationError('ensure_failed');
    }
    return 'none';
  } catch (error) {
    logPushClientIssue('reconcile failed', error);
    if (hasServerPushRegistration()) {
      setPushRegistrationError(null);
      return 'server';
    }
    localPushSubscription = null;
    serverPushRegistrationConfirmed = false;
    setPushRegistrationError(classifyPushRegistrationError(error));
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
