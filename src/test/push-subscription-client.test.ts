import { describe, expect, test } from 'vitest';
import {
  formatPushRegistrationError,
  hasMatchingApplicationServerKey,
  requiresUserGestureForPushSubscribe,
  urlBase64ToUint8Array,
} from '@/lib/push-subscription-client';

function makeSubscription(applicationServerKey: Uint8Array | null): PushSubscription {
  return {
    options: {
      applicationServerKey: applicationServerKey?.buffer ?? null,
      userVisibleOnly: true,
    },
  } as PushSubscription;
}

describe('push-subscription-client', () => {
  test('detects whether an existing subscription matches the current VAPID public key', () => {
    const vapidKey = 'BEl6EeS_VrZL9AJpCz8kW0mUQ2f-lcOf8A0PGR3_VI-hQ9q9D4iYy3rsnFfG1QfQ_f8uOeKsKI0YqQ9uY7fR5bk';
    const expected = urlBase64ToUint8Array(vapidKey);

    expect(hasMatchingApplicationServerKey(makeSubscription(expected), vapidKey)).toBe(true);

    const mismatched = new Uint8Array(expected);
    mismatched[0] = mismatched[0] === 0 ? 1 : 0;
    expect(hasMatchingApplicationServerKey(makeSubscription(mismatched), vapidKey)).toBe(false);
  });

  test('treats subscriptions without an exposed applicationServerKey as valid (Safari/iOS)', () => {
    expect(hasMatchingApplicationServerKey(makeSubscription(null), 'BAAAAAAAAA')).toBe(true);
  });

  test('requiresUserGestureForPushSubscribe detects iPhone and iPad', () => {
    expect(
      requiresUserGestureForPushSubscribe(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15',
      ),
    ).toBe(true);
    expect(
      requiresUserGestureForPushSubscribe(
        'Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15',
      ),
    ).toBe(true);
    expect(
      requiresUserGestureForPushSubscribe(
        'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile',
      ),
    ).toBe(false);
  });

  test('formatPushRegistrationError returns localized messages', () => {
    expect(formatPushRegistrationError('gesture_required', true)).toContain('กดปุ่ม');
    expect(formatPushRegistrationError('gesture_required', false)).toContain('Register');
  });
});
