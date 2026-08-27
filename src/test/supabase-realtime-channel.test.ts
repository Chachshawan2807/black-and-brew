import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { removeChannel, getChannels } = vi.hoisted(() => ({
  removeChannel: vi.fn().mockResolvedValue('ok'),
  getChannels: vi.fn().mockReturnValue([]),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    removeChannel,
    getChannels,
  },
}));

import {
  SUPABASE_REALTIME_TEARDOWN_DELAY_MS,
  findSupabaseChannelByName,
  isSupabaseChannelReusable,
  prepareSupabaseChannelName,
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

describe('prepareSupabaseChannelName', () => {
  beforeEach(() => {
    removeChannel.mockReset();
    getChannels.mockReset();
    getChannels.mockReturnValue([]);
  });

  test('reuses joined channels without removeChannel', async () => {
    const joined = { topic: 'realtime:inventory_items_shared', state: 'joined' };
    getChannels.mockReturnValue([joined]);

    const result = await prepareSupabaseChannelName('inventory_items_shared');

    expect(result.reused).toBe(joined);
    expect(removeChannel).not.toHaveBeenCalled();
  });

  test('removes stale channels before creating a fresh listener set', async () => {
    const stale = { topic: 'realtime:bb-shifts-shared', state: 'closed' };
    getChannels.mockReturnValue([stale]);

    const result = await prepareSupabaseChannelName('bb-shifts-shared');

    expect(result.reused).toBeNull();
    expect(removeChannel).toHaveBeenCalledWith(stale);
  });

  test('findSupabaseChannelByName matches realtime topic', () => {
    const channel = { topic: 'realtime:inventory_items_shared', state: 'joined' };
    getChannels.mockReturnValue([channel]);

    expect(findSupabaseChannelByName('inventory_items_shared')).toBe(channel);
    expect(isSupabaseChannelReusable(channel as never)).toBe(true);
  });
});
