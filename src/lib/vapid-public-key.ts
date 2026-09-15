/** VAPID public key helpers for Web Push subscribe() (Chrome/Android BufferSource). */

const UNCOMPRESSED_P256_LENGTH = 65;

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

export function bufferSourceToUint8Array(key: BufferSource): Uint8Array {
  if (key instanceof ArrayBuffer) {
    return new Uint8Array(key);
  }
  return new Uint8Array(key.buffer, key.byteOffset, key.byteLength);
}

/**
 * Chrome Android rejects some Uint8Array views. Copy into a standalone ArrayBuffer
 * of exactly 65 bytes (uncompressed P-256).
 */
export function vapidPublicKeyToApplicationServerKey(raw: string): ArrayBuffer {
  const bytes = urlBase64ToUint8Array(raw);
  if (bytes.byteLength !== UNCOMPRESSED_P256_LENGTH) {
    throw new Error('vapid_key_invalid');
  }
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
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
