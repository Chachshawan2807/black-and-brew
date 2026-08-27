import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Matches use-shift-realtime: avoids "closed before connection established" on dev remounts. */
export const SUPABASE_REALTIME_TEARDOWN_DELAY_MS = 50;

export function supabaseRealtimeTopic(channelName: string): string {
  return `realtime:${channelName}`;
}

export function findSupabaseChannelByName(
  channelName: string,
): RealtimeChannel | undefined {
  if (typeof supabase.getChannels !== 'function') return undefined;
  const topic = supabaseRealtimeTopic(channelName);
  return supabase.getChannels().find((channel) => channel.topic === topic);
}

export async function removeSupabaseChannelByName(channelName: string): Promise<void> {
  const existing = findSupabaseChannelByName(channelName);
  if (existing && typeof supabase.removeChannel === 'function') {
    await supabase.removeChannel(existing);
  }
}

/** Joined channels already have postgres_changes handlers attached. */
export function isSupabaseChannelReusable(channel: RealtimeChannel): boolean {
  return channel.state === 'joined';
}

/**
 * Reuse a joined shared channel or remove a stale one before attaching new listeners.
 * Prevents: "cannot add postgres_changes callbacks ... after subscribe()".
 */
export async function prepareSupabaseChannelName(
  channelName: string,
): Promise<{ reused: RealtimeChannel | null }> {
  const existing = findSupabaseChannelByName(channelName);
  if (!existing) return { reused: null };

  if (isSupabaseChannelReusable(existing)) {
    return { reused: existing };
  }

  if (typeof supabase.removeChannel === 'function') {
    await supabase.removeChannel(existing);
  }

  return { reused: null };
}

/**
 * Defers removeChannel so React Strict Mode / Fast Refresh cleanups do not tear down
 * a channel while the shared Realtime socket is still connecting.
 */
export function scheduleSupabaseChannelTeardown(
  channel: RealtimeChannel,
  options?: {
    delayMs?: number;
    shouldTeardown?: () => boolean;
  },
): () => void {
  const delayMs = options?.delayMs ?? SUPABASE_REALTIME_TEARDOWN_DELAY_MS;
  const timer = setTimeout(() => {
    if (options?.shouldTeardown && !options.shouldTeardown()) return;
    void supabase.removeChannel(channel);
  }, delayMs);

  return () => {
    clearTimeout(timer);
  };
}
