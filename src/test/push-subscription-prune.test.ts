import { describe, expect, test } from 'vitest';
import { pushSubscriptionIdsToPruneForSession } from '@/lib/push-subscription-prune';

describe('pushSubscriptionIdsToPruneForSession', () => {
  test('removes duplicate endpoints for the same client session id', () => {
    const ids = pushSubscriptionIdsToPruneForSession(
      [
        { id: 'keep', endpoint: 'https://push.example/current', client_session_id: 'device-1' },
        { id: 'old-a', endpoint: 'https://push.example/old-a', client_session_id: 'device-1' },
        { id: 'other', endpoint: 'https://push.example/tablet', client_session_id: 'device-2' },
      ],
      'https://push.example/current',
      'device-1',
    );

    expect(ids).toEqual(['old-a']);
  });

  test('returns empty when session id is missing', () => {
    expect(
      pushSubscriptionIdsToPruneForSession(
        [{ id: 'a', endpoint: 'https://push.example/a', client_session_id: 'x' }],
        'https://push.example/b',
        '',
      ),
    ).toEqual([]);
  });
});
