import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SidebarMenuOrderSync } from '@/components/sidebar/SidebarMenuOrderSync';

vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/app/actions/app-preferences-actions', () => ({
  getSidebarMenuOrder: vi.fn().mockResolvedValue({ success: true, orderIds: null, updatedAt: null }),
  saveSidebarMenuOrder: vi.fn().mockResolvedValue({ success: true, updatedAt: null }),
}));

const channelMocks = vi.hoisted(() => {
  const on = vi.fn().mockReturnThis();
  const subscribe = vi.fn();
  const channel = vi.fn(() => ({ on, subscribe }));
  const removeChannel = vi.fn().mockResolvedValue('ok');
  const getChannels = vi.fn().mockReturnValue([]);
  return { on, subscribe, channel, removeChannel, getChannels };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: channelMocks.channel,
    removeChannel: channelMocks.removeChannel,
    getChannels: channelMocks.getChannels,
  },
}));

describe('SidebarMenuOrderSync channel lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelMocks.getChannels.mockReturnValue([]);
  });

  test('removes stale channels before subscribing again', async () => {
    const staleChannel = { topic: 'realtime:sidebar_menu_order_main' };
    channelMocks.getChannels.mockReturnValue([staleChannel]);

    const { unmount } = render(<SidebarMenuOrderSync />);

    await waitFor(() => expect(channelMocks.removeChannel).toHaveBeenCalledWith(staleChannel));
    await waitFor(() =>
      expect(channelMocks.channel).toHaveBeenCalledWith('sidebar_menu_order_main'),
    );
    expect(channelMocks.on).toHaveBeenCalled();
    expect(channelMocks.subscribe).toHaveBeenCalled();

    unmount();
  });
});
