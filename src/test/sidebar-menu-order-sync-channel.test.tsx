import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SidebarMenuOrderSync } from '@/components/sidebar/SidebarMenuOrderSync';
import { removeSupabaseChannelByName } from '@/lib/supabase-realtime-channel';

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

vi.mock('@/lib/supabase-realtime-channel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase-realtime-channel')>();
  return {
    ...actual,
    removeSupabaseChannelByName: vi.fn().mockResolvedValue(undefined),
    scheduleSupabaseChannelTeardown: vi.fn(() => () => {}),
  };
});

describe('SidebarMenuOrderSync channel lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelMocks.getChannels.mockReturnValue([]);
  });

  test('removes stale channels before subscribing again', async () => {
    const { unmount } = render(<SidebarMenuOrderSync />);

    await waitFor(() =>
      expect(removeSupabaseChannelByName).toHaveBeenCalledWith('sidebar_menu_order_main'),
    );
    await waitFor(() =>
      expect(channelMocks.channel).toHaveBeenCalledWith('sidebar_menu_order_main'),
    );
    expect(channelMocks.on).toHaveBeenCalled();
    expect(channelMocks.subscribe).toHaveBeenCalled();

    unmount();
  });
});
