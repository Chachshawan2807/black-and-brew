import { describe, expect, test } from 'vitest';
import {
  REALTIME_RESUME_RECONNECT_HIDDEN_MS,
  shouldReconnectRealtimeOnResume,
} from '@/lib/supabase-realtime-resume';

describe('shouldReconnectRealtimeOnResume', () => {
  test('keeps the existing socket when the tab was only briefly hidden', () => {
    expect(
      shouldReconnectRealtimeOnResume(
        REALTIME_RESUME_RECONNECT_HIDDEN_MS - 1,
        true,
        false,
      ),
    ).toBe(false);
  });

  test('reconnects after the tab was hidden long enough', () => {
    expect(
      shouldReconnectRealtimeOnResume(
        REALTIME_RESUME_RECONNECT_HIDDEN_MS,
        true,
        false,
      ),
    ).toBe(true);
  });

  test('reconnects when the realtime socket is disconnected', () => {
    expect(shouldReconnectRealtimeOnResume(0, false, false)).toBe(true);
  });

  test('does not reconnect while the socket is still connecting', () => {
    expect(shouldReconnectRealtimeOnResume(10_000, false, true)).toBe(false);
  });
});
