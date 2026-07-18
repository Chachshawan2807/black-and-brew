/** Pure helpers for serializing PushSubscription payloads (testable without browser mocks). */

export interface PushSubscriptionRegisterPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function classifyPushEndpoint(endpoint: string): 'apple' | 'fcm' | 'other' {
  if (endpoint.includes('web.push.apple.com')) return 'apple';
  if (endpoint.includes('fcm.googleapis.com')) return 'fcm';
  return 'other';
}

/**
 * Safari / iOS PWAs may omit keys in toJSON() — fall back to getKey() + base64url.
 */
export function extractPushSubscriptionPayload(
  subscription: Pick<PushSubscription, 'endpoint' | 'toJSON' | 'getKey'>,
): PushSubscriptionRegisterPayload | null {
  const json = subscription.toJSON();
  let p256dh = json.keys?.p256dh;
  let auth = json.keys?.auth;

  if (!p256dh) {
    const raw = subscription.getKey('p256dh');
    if (raw) p256dh = arrayBufferToBase64Url(raw);
  }
  if (!auth) {
    const raw = subscription.getKey('auth');
    if (raw) auth = arrayBufferToBase64Url(raw);
  }

  if (!json.endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
  };
}
