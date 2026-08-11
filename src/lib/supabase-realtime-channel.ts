import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Matches use-shift-realtime: avoids "closed before connection established" on dev remounts. */
export const SUPABASE_REALTIME_TEARDOWN_DELAY_MS = 50;

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
