import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Matches use-shift-realtime: avoids "closed before connection established" on dev remounts. */
export const SUPABASE_REALTIME_TEARDOWN_DELAY_MS = 50;

const CHANNEL_REMOVE_POLL_MS = 10;
const CHANNEL_REMOVE_TIMEOUT_MS = 500;
const REALTIME_CONNECT_POLL_MS = 10;
const REALTIME_CONNECT_TIMEOUT_MS = 500;

function isSupabaseRealtimeConnecting(): boolean {
  return (
    typeof supabase.realtime?.isConnecting === 'function' &&
    supabase.realtime.isConnecting()
  );
}

/** Wait until the shared Realtime socket leaves CONNECTING before removeChannel. */
export async function waitUntilRealtimeNotConnecting(
  timeoutMs = REALTIME_CONNECT_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (isSupabaseRealtimeConnecting()) {
    if (Date.now() > deadline) return;

    await new Promise<void>((resolve) => {
      setTimeout(resolve, REALTIME_CONNECT_POLL_MS);
    });
  }
}

async function removeSupabaseChannelWhenReady(channel: RealtimeChannel): Promise<void> {
  if (typeof supabase.removeChannel !== 'function') return;

  await waitUntilRealtimeNotConnecting();
  await supabase.removeChannel(channel);
}

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
  if (existing) {
    await removeSupabaseChannelWhenReady(existing);
    await waitUntilSupabaseChannelRemoved(channelName);
  }
}

/** Joined or still subscribing postgres_changes handlers must not be attached again. */
export function isSupabaseChannelAttached(channel: RealtimeChannel): boolean {
  return channel.state === 'joined' || channel.state === 'joining';
}

/** Joined/joining channels already have postgres_changes handlers attached. */
export function isSupabaseChannelReusable(channel: RealtimeChannel): boolean {
  return isSupabaseChannelAttached(channel);
}

/**
 * supabase.channel(name) returns an existing topic even while joining/leaving.
 * Wait until removeChannel clears the registry before creating a fresh listener set.
 */
export async function waitUntilSupabaseChannelRemoved(channelName: string): Promise<void> {
  const deadline = Date.now() + CHANNEL_REMOVE_TIMEOUT_MS;

  while (findSupabaseChannelByName(channelName)) {
    if (Date.now() > deadline) {
      const lingering = findSupabaseChannelByName(channelName);
      if (lingering) {
        await removeSupabaseChannelWhenReady(lingering);
      }
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, CHANNEL_REMOVE_POLL_MS);
    });
  }
}

/**
 * Reuse an attached shared channel or remove a stale one before attaching new listeners.
 * Prevents: "cannot add postgres_changes callbacks ... after subscribe()".
 */
export async function prepareSupabaseChannelName(
  channelName: string,
): Promise<{ reused: RealtimeChannel | null }> {
  const existing = findSupabaseChannelByName(channelName);
  if (!existing) return { reused: null };

  if (isSupabaseChannelAttached(existing)) {
    return { reused: existing };
  }

  if (typeof supabase.removeChannel === 'function') {
    await removeSupabaseChannelWhenReady(existing);
    await waitUntilSupabaseChannelRemoved(channelName);
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
    void (async () => {
      if (options?.shouldTeardown && !options.shouldTeardown()) return;
      await waitUntilRealtimeNotConnecting();
      if (options?.shouldTeardown && !options.shouldTeardown()) return;
      if (typeof supabase.removeChannel === 'function') {
        await supabase.removeChannel(channel);
      }
    })();
  }, delayMs);

  return () => {
    clearTimeout(timer);
  };
}
