import { describe, expect, test } from 'vitest';
import {
  arrayBufferToBase64Url,
  classifyPushEndpoint,
  extractPushSubscriptionPayload,
} from '@/lib/push-subscription-payload';

function makeSubscription(input: {
  endpoint: string;
  toJsonKeys?: { p256dh?: string; auth?: string } | null;
  getKey?: (name: 'p256dh' | 'auth') => ArrayBuffer | null;
}): PushSubscription {
  return {
    endpoint: input.endpoint,
    toJSON: () => ({
      endpoint: input.endpoint,
      expirationTime: null,
      keys: input.toJsonKeys ?? undefined,
    }),
    getKey: (name: 'p256dh' | 'auth') => input.getKey?.(name) ?? null,
  } as PushSubscription;
}

describe('push-subscription-payload', () => {
  test('classifyPushEndpoint detects Apple and FCM hosts', () => {
    expect(classifyPushEndpoint('https://web.push.apple.com/QKx7f')).toBe('apple');
    expect(classifyPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe('fcm');
    expect(classifyPushEndpoint('https://push.example/1')).toBe('other');
  });

  test('extractPushSubscriptionPayload uses toJSON keys when present', () => {
    const payload = extractPushSubscriptionPayload(
      makeSubscription({
        endpoint: 'https://web.push.apple.com/abc',
        toJsonKeys: { p256dh: 'p256-key', auth: 'auth-key' },
      }),
    );
    expect(payload).toEqual({
      endpoint: 'https://web.push.apple.com/abc',
      keys: { p256dh: 'p256-key', auth: 'auth-key' },
    });
  });

  test('extractPushSubscriptionPayload falls back to getKey when toJSON omits keys (Safari/iOS)', () => {
    const p256dh = new Uint8Array([1, 2, 3, 4]).buffer;
    const auth = new Uint8Array([9, 8, 7]).buffer;

    const payload = extractPushSubscriptionPayload(
      makeSubscription({
        endpoint: 'https://web.push.apple.com/abc',
        toJsonKeys: null,
        getKey: (name) => (name === 'p256dh' ? p256dh : auth),
      }),
    );

    expect(payload?.endpoint).toBe('https://web.push.apple.com/abc');
    expect(payload?.keys.p256dh).toBe(arrayBufferToBase64Url(p256dh));
    expect(payload?.keys.auth).toBe(arrayBufferToBase64Url(auth));
  });

  test('extractPushSubscriptionPayload returns null when keys are unavailable', () => {
    expect(
      extractPushSubscriptionPayload(
        makeSubscription({
          endpoint: 'https://web.push.apple.com/abc',
          toJsonKeys: null,
        }),
      ),
    ).toBeNull();
  });
});
