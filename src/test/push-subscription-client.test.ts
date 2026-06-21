import { describe, expect, test } from 'vitest';
import {
  hasMatchingApplicationServerKey,
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

  test('treats subscriptions without an applicationServerKey as stale', () => {
    expect(hasMatchingApplicationServerKey(makeSubscription(null), 'BAAAAAAAAA')).toBe(false);
  });
});
