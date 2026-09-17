import { describe, expect, test } from 'vitest';
import {
  classifyPushRegistrationError,
  isRetryablePushRegisterError,
  shouldReplaceLocalPushSubscription,
} from '@/lib/push-registration-errors';
import {
  applicationServerKeysMatch,
  urlBase64ToUint8Array,
  vapidApplicationServerKeyCandidates,
  vapidPublicKeyToApplicationServerKey,
  toPushSubscribeOptions,
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

  test('maps Chrome overload-resolution failures to vapid_key_invalid', () => {
    expect(
      classifyPushRegistrationError(
        new TypeError(
          "Failed to execute 'subscribe' on 'PushManager': Overload resolution failed.",
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

  test('maps iOS non-PWA push errors to push_unavailable', () => {
    expect(classifyPushRegistrationError(new Error('push_requires_installed_pwa'))).toBe(
      'push_unavailable',
    );
  });

  test('maps stale PWA Server Action and network failures to server_unreachable', () => {
    expect(
      classifyPushRegistrationError(new Error('Failed to find Server Action "xyz"')),
    ).toBe('server_unreachable');
    expect(classifyPushRegistrationError(new TypeError('Failed to fetch'))).toBe(
      'server_unreachable',
    );
    expect(classifyPushRegistrationError(new TypeError('Load failed'))).toBe('server_unreachable');
  });
});

describe('shouldReplaceLocalPushSubscription', () => {
  test('never drops a local endpoint after a retryable register failure', () => {
    expect(shouldReplaceLocalPushSubscription('missing')).toBe(false);
    expect(shouldReplaceLocalPushSubscription('registered')).toBe(false);
    expect(shouldReplaceLocalPushSubscription('unauthorized')).toBe(false);
    expect(shouldReplaceLocalPushSubscription('error')).toBe(false);
  });

  test('session and transport errors stay retryable so Settings can upsert again', () => {
    expect(isRetryablePushRegisterError('supabase_session_missing')).toBe(true);
    expect(isRetryablePushRegisterError('pin_session_required')).toBe(true);
    expect(isRetryablePushRegisterError('server_unreachable')).toBe(true);
    expect(isRetryablePushRegisterError('invalid_subscription')).toBe(false);
  });
});

describe('vapidPublicKeyToApplicationServerKey', () => {
  test('copies a 65-byte uncompressed P-256 key into a standalone Uint8Array for Chrome', () => {
    const key = vapidPublicKeyToApplicationServerKey(`  ${VALID_VAPID}  `);
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.byteLength).toBe(65);
    expect(key.byteOffset).toBe(0);
    expect(key[0]).toBe(0x04);
  });

  test('exposes Uint8Array then detached ArrayBuffer candidates for Chrome Android subscribe', () => {
    const [bytes, buffer] = vapidApplicationServerKeyCandidates(VALID_VAPID);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBe(65);
    expect(bytes.buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBe(65);
  });

  test('VAPID candidates can be passed to PushManager.subscribe options', () => {
    const [bytes, buffer] = vapidApplicationServerKeyCandidates(VALID_VAPID);
    expect(toPushSubscribeOptions(bytes).applicationServerKey).toBe(bytes);
    expect(toPushSubscribeOptions(buffer).applicationServerKey).toBe(buffer);
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
