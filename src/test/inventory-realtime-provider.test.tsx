import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { InventoryRealtimeProvider, useInventoryRealtime } from '@/contexts/InventoryRealtimeContext';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/supabase-realtime-channel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase-realtime-channel')>();
  return {
    ...actual,
    scheduleSupabaseChannelTeardown: (channel: unknown) => {
      void supabase.removeChannel(channel as never);
      return () => {};
    },
  };
});

function RealtimeSubscriber() {
  const { subscribe } = useInventoryRealtime();

  useEffect(() => subscribe(() => {}), [subscribe]);

  return null;
}

describe('InventoryRealtimeProvider channel lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.getChannels).mockReturnValue([]);
  });

  test('does not open an inventory websocket until a consumer subscribes', async () => {
    render(
      <InventoryRealtimeProvider>
        <div />
      </InventoryRealtimeProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  test('opens realtime for active subscribers and removes it after unsubscribe', async () => {
    const { unmount } = render(
      <InventoryRealtimeProvider>
        <RealtimeSubscriber />
      </InventoryRealtimeProvider>,
    );

    await waitFor(() => expect(supabase.channel).toHaveBeenCalledWith('inventory_items_shared'));

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  test('reuses a joined shared channel instead of attaching listeners after subscribe', async () => {
    const joinedChannel = {
      topic: 'realtime:inventory_items_shared',
      state: 'joined',
    };
    vi.mocked(supabase.getChannels).mockReturnValue([joinedChannel as never]);

    render(
      <InventoryRealtimeProvider>
        <RealtimeSubscriber />
      </InventoryRealtimeProvider>,
    );

    await waitFor(() => expect(supabase.getChannels).toHaveBeenCalled());
    expect(supabase.channel).not.toHaveBeenCalled();
  });
});
