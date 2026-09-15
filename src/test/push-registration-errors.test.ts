import { describe, expect, test } from 'vitest';
import { classifyPushRegistrationError, shouldReplaceLocalPushSubscription } from '@/lib/push-registration-errors';
import {
  applicationServerKeysMatch,
  urlBase64ToUint8Array,
  vapidPublicKeyToApplicationServerKey,
} from '@/lib/vapid-public-key';

const VALID_VAPID =
  'BEl6EeS_VrZL9AJpCz8kW0mUQ2f-lcOf8A0PGR3_VI-hQ9q9D4iYy3rsnFfG1QfQ_f8uOeKsKI0YqQ9uY7fR5bk';

describe('classifyPushRegistrationError', () => {
  test('maps Chrome Android concurrent subscribe to a retryable code', () => {
    expect(
      classifyPushRegistrationError(new DOMException('Subscription failed', 'InvalidStateError')),
    ).toBe('subscribe_in_progress');
  });

  test('maps missing user gesture to gesture_required', () => {
    expect(
      classifyPushRegistrationError(new DOMException('Registration failed', 'NotAllowedError')),
    ).toBe('gesture_required');
  });

  test('maps invalid VAPID applicationServerKey errors', () => {
    expect(
      classifyPushRegistrationError(
        new DOMException(
          "Failed to execute 'subscribe' on 'PushManager': The provided applicationServerKey is not valid.",
          'InvalidAccessError',
        ),
      ),
    ).toBe('vapid_key_invalid');
  });

  test('maps missing push service to push_unavailable', () => {
    expect(
      classifyPushRegistrationError(
        new DOMException('Registration failed - push service not available', 'AbortError'),
      ),
    ).toBe('push_unavailable');
  });
});

describe('shouldReplaceLocalPushSubscription', () => {
  test('drops only endpoints the server confirmed are gone', () => {
    expect(shouldReplaceLocalPushSubscription('missing')).toBe(true);
    expect(shouldReplaceLocalPushSubscription('registered')).toBe(false);
    expect(shouldReplaceLocalPushSubscription('unauthorized')).toBe(false);
    expect(shouldReplaceLocalPushSubscription('error')).toBe(false);
  });
});

describe('vapidPublicKeyToApplicationServerKey', () => {
  test('copies a 65-byte uncompressed P-256 key into a standalone ArrayBuffer', () => {
    const key = vapidPublicKeyToApplicationServerKey(`  ${VALID_VAPID}  `);
    expect(key.byteLength).toBe(65);
    expect(new Uint8Array(key)[0]).toBe(0x04);
  });

  test('rejects keys that are not uncompressed P-256', () => {
    expect(() => vapidPublicKeyToApplicationServerKey('AAAA')).toThrow('vapid_key_invalid');
  });

  test('applicationServerKeysMatch ignores ArrayBufferView byteOffset', () => {
    const expected = urlBase64ToUint8Array(VALID_VAPID);
    const padded = new Uint8Array(expected.byteLength + 4);
    padded.set(expected, 2);
    const view = padded.subarray(2, 2 + expected.byteLength);
    expect(applicationServerKeysMatch(view, VALID_VAPID)).toBe(true);
  });
});
