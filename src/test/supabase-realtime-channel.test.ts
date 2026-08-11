import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { removeChannel } = vi.hoisted(() => ({
  removeChannel: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    removeChannel,
  },
}));

import {
  SUPABASE_REALTIME_TEARDOWN_DELAY_MS,
  scheduleSupabaseChannelTeardown,
} from '@/lib/supabase-realtime-channel';

describe('scheduleSupabaseChannelTeardown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    removeChannel.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('defers removeChannel until after the teardown window', () => {
    const channel = { topic: 'test' } as never;
    scheduleSupabaseChannelTeardown(channel);

    expect(removeChannel).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SUPABASE_REALTIME_TEARDOWN_DELAY_MS - 1);
    expect(removeChannel).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  test('cancel prevents removeChannel when a new subscriber arrives quickly', () => {
    const channel = { topic: 'test' } as never;
    let allowTeardown = false;
    const cancel = scheduleSupabaseChannelTeardown(channel, {
      shouldTeardown: () => allowTeardown,
    });

    vi.advanceTimersByTime(SUPABASE_REALTIME_TEARDOWN_DELAY_MS);
    expect(removeChannel).not.toHaveBeenCalled();

    cancel();
    allowTeardown = true;
    vi.advanceTimersByTime(SUPABASE_REALTIME_TEARDOWN_DELAY_MS);
    expect(removeChannel).not.toHaveBeenCalled();
  });
});
