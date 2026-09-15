/** VAPID public key helpers for Web Push subscribe() (Chrome/Android BufferSource). */

const UNCOMPRESSED_P256_LENGTH = 65;

/** DOM PushManager.subscribe() key type (ArrayBuffer-backed, not ArrayBufferLike). */
export type PushApplicationServerKey = NonNullable<
  PushSubscriptionOptionsInit['applicationServerKey']
>;

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const normalized = base64String.trim().replace(/^"+|"+$/g, '');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const base64 = (normalized + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function bufferSourceToUint8Array(key: BufferSource): Uint8Array<ArrayBuffer> {
  if (key instanceof ArrayBuffer) {
    return new Uint8Array(key);
  }
  return new Uint8Array(key.buffer, key.byteOffset, key.byteLength);
}

/**
 * Chrome Android expects a Uint8Array of exactly 65 bytes (uncompressed P-256).
 * Copy so the view is not a slice of a larger buffer.
 */
export function vapidPublicKeyToApplicationServerKey(raw: string): Uint8Array<ArrayBuffer> {
  const bytes = urlBase64ToUint8Array(raw);
  if (bytes.byteLength !== UNCOMPRESSED_P256_LENGTH) {
    throw new Error('vapid_key_invalid');
  }
  return new Uint8Array(bytes);
}

/**
 * Chrome Android historically rejected ArrayBuffer, then some builds rejected Uint8Array.
 * Try a copied Uint8Array first, then a detached ArrayBuffer of the same 65 bytes.
 */
export function vapidApplicationServerKeyCandidates(
  raw: string,
): [Uint8Array<ArrayBuffer>, ArrayBuffer] {
  const bytes = vapidPublicKeyToApplicationServerKey(raw);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  return [bytes, buffer];
}

export function toPushSubscribeOptions(
  applicationServerKey: PushApplicationServerKey,
): PushSubscriptionOptionsInit {
  return {
    userVisibleOnly: true,
    applicationServerKey,
  };
}

export function applicationServerKeysMatch(
  existingKey: BufferSource | null | undefined,
  vapidPublicKey: string,
): boolean {
  if (!existingKey) return true;

  const expected = urlBase64ToUint8Array(vapidPublicKey);
  const current = bufferSourceToUint8Array(existingKey);
  if (current.byteLength !== expected.byteLength) return false;

  for (let i = 0; i < current.byteLength; i += 1) {
    if (current[i] !== expected[i]) return false;
  }
  return true;
}

/**
 * TS 5.7+ default Uint8Array is Uint8Array<ArrayBufferLike>, which is not a
 * BufferSource. This constraint keeps next build failing if VAPID helpers
 * widen back to ArrayBufferLike.
 */
type AssertAssignableToPushApplicationServerKey<T extends PushApplicationServerKey> = T;

export type VapidPushApplicationServerKey = AssertAssignableToPushApplicationServerKey<
  ReturnType<typeof vapidApplicationServerKeyCandidates>[number]
>;
