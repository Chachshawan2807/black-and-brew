import { createHash } from 'node:crypto';

/** Stable WebAuthn user handle per device fingerprint. */
export function fingerprintToPasskeyUserId(sessionFingerprint: string): Uint8Array<ArrayBuffer> {
  const hash = createHash('sha256').update(sessionFingerprint, 'utf8').digest();
  return new Uint8Array(hash.buffer, hash.byteOffset, hash.byteLength);
}
