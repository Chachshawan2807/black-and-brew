import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { removeChannel, getChannels, isConnecting } = vi.hoisted(() => ({
  removeChannel: vi.fn().mockResolvedValue('ok'),
  getChannels: vi.fn().mockReturnValue([]),
  isConnecting: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    removeChannel,
    getChannels,
    realtime: { isConnecting },
  },
}));

import {
  SUPABASE_REALTIME_TEARDOWN_DELAY_MS,
  findSupabaseChannelByName,
  isSupabaseChannelAttached,
  isSupabaseChannelReusable,
  prepareSupabaseChannelName,
  removeSupabaseChannelByName,
  scheduleSupabaseChannelTeardown,
  waitUntilRealtimeNotConnecting,
  waitUntilSupabaseChannelRemoved,
} from '@/lib/supabase-realtime-channel';

describe('scheduleSupabaseChannelTeardown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    removeChannel.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('defers removeChannel until after the teardown window', async () => {
    const channel = { topic: 'test' } as never;
    scheduleSupabaseChannelTeardown(channel);

    expect(removeChannel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SUPABASE_REALTIME_TEARDOWN_DELAY_MS - 1);
    expect(removeChannel).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  test('defers removeChannel while the shared realtime socket is still connecting', async () => {
    isConnecting.mockReturnValue(true);
    const channel = { topic: 'test' } as never;
    scheduleSupabaseChannelTeardown(channel);

    await vi.advanceTimersByTimeAsync(SUPABASE_REALTIME_TEARDOWN_DELAY_MS);
    expect(removeChannel).not.toHaveBeenCalled();

    isConnecting.mockReturnValue(false);
    await vi.advanceTimersByTimeAsync(10);
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  test('cancel prevents removeChannel when a new subscriber arrives quickly', async () => {
    const channel = { topic: 'test' } as never;
    let allowTeardown = false;
    const cancel = scheduleSupabaseChannelTeardown(channel, {
      shouldTeardown: () => allowTeardown,
    });

    await vi.advanceTimersByTimeAsync(SUPABASE_REALTIME_TEARDOWN_DELAY_MS);
    expect(removeChannel).not.toHaveBeenCalled();

    cancel();
    allowTeardown = true;
    await vi.advanceTimersByTimeAsync(SUPABASE_REALTIME_TEARDOWN_DELAY_MS);
    expect(removeChannel).not.toHaveBeenCalled();
  });
});

describe('waitUntilRealtimeNotConnecting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    isConnecting.mockReset();
    isConnecting.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('polls until the shared realtime socket finishes connecting', async () => {
    isConnecting.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValue(false);

    const pending = waitUntilRealtimeNotConnecting();
    await vi.advanceTimersByTimeAsync(25);
    await pending;

    expect(isConnecting).toHaveBeenCalled();
  });
});

describe('removeSupabaseChannelByName', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    removeChannel.mockReset();
    getChannels.mockReset();
    isConnecting.mockReset();
    isConnecting.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('waits for connecting socket before removeChannel', async () => {
    const stale = { topic: 'realtime:bb-home-service-records', state: 'closed' };
    getChannels.mockReturnValueOnce([stale]).mockReturnValue([]);
    isConnecting.mockReturnValueOnce(true).mockReturnValue(false);

    const pending = removeSupabaseChannelByName('bb-home-service-records');
    await vi.advanceTimersByTimeAsync(15);
    await pending;

    expect(removeChannel).toHaveBeenCalledWith(stale);
  });
});

describe('prepareSupabaseChannelName', () => {
  beforeEach(() => {
    removeChannel.mockReset();
    getChannels.mockReset();
    isConnecting.mockReset();
    isConnecting.mockReturnValue(false);
    getChannels.mockReturnValue([]);
  });

  test('reuses joined channels without removeChannel', async () => {
    const joined = { topic: 'realtime:inventory_items_shared', state: 'joined' };
    getChannels.mockReturnValue([joined]);

    const result = await prepareSupabaseChannelName('inventory_items_shared');

    expect(result.reused).toBe(joined);
    expect(removeChannel).not.toHaveBeenCalled();
  });

  test('reuses joining channels without removeChannel', async () => {
    const joining = { topic: 'realtime:bb-shifts-shared', state: 'joining' };
    getChannels.mockReturnValue([joining]);

    const result = await prepareSupabaseChannelName('bb-shifts-shared');

    expect(result.reused).toBe(joining);
    expect(removeChannel).not.toHaveBeenCalled();
    expect(isSupabaseChannelAttached(joining as never)).toBe(true);
  });

  test('removes stale channels before creating a fresh listener set', async () => {
    const stale = { topic: 'realtime:bb-shifts-shared', state: 'closed' };
    getChannels.mockReturnValueOnce([stale]).mockReturnValue([]);

    const result = await prepareSupabaseChannelName('bb-shifts-shared');

    expect(result.reused).toBeNull();
    expect(removeChannel).toHaveBeenCalledWith(stale);
  });

  test('waitUntilSupabaseChannelRemoved polls until topic is gone', async () => {
    vi.useFakeTimers();
    const stale = { topic: 'realtime:inventory_items_shared', state: 'leaving' };
    getChannels.mockReturnValueOnce([stale]).mockReturnValue([]);

    const pending = waitUntilSupabaseChannelRemoved('inventory_items_shared');
    await vi.advanceTimersByTimeAsync(10);
    await pending;

    expect(getChannels).toHaveBeenCalled();
    vi.useRealTimers();
  });

  test('findSupabaseChannelByName matches realtime topic', () => {
    const channel = { topic: 'realtime:inventory_items_shared', state: 'joined' };
    getChannels.mockReturnValue([channel]);

    expect(findSupabaseChannelByName('inventory_items_shared')).toBe(channel);
    expect(isSupabaseChannelReusable(channel as never)).toBe(true);
  });
});
