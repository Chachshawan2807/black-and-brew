'use client';

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import {
  scheduleSupabaseChannelTeardown,
  findSupabaseChannelByName,
  isSupabaseChannelReusable,
  prepareSupabaseChannelName,
} from '@/lib/supabase-realtime-channel';

type Listener = () => void;

const shiftListeners = new Set<Listener>();
const profileListeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
let channelStarting: Promise<void> | null = null;
let teardownCancel: (() => void) | null = null;

function cancelSharedShiftChannelTeardown() {
  teardownCancel?.();
  teardownCancel = null;
}

async function ensureSharedShiftChannel() {
  cancelSharedShiftChannelTeardown();

  const existing = findSupabaseChannelByName('bb-shifts-shared');
  if (existing && isSupabaseChannelReusable(existing)) {
    channel = existing;
    return;
  }

  if (channel) return;
  if (channelStarting) {
    await channelStarting;
    return;
  }

  channelStarting = (async () => {
    await ensureSupabaseSession();

    const prepared = await prepareSupabaseChannelName('bb-shifts-shared');
    if (prepared.reused) {
      channel = prepared.reused;
      return;
    }

    channel = supabase
      .channel('bb-shifts-shared')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        shiftListeners.forEach((listener) => listener());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        profileListeners.forEach((listener) => listener());
      })
      .subscribe();
  })();

  try {
    await channelStarting;
  } finally {
    channelStarting = null;
  }
}

function teardownSharedShiftChannel() {
  if (subscriberCount > 0 || !channel) return;

  cancelSharedShiftChannelTeardown();
  const activeChannel = channel;
  teardownCancel = scheduleSupabaseChannelTeardown(activeChannel, {
    shouldTeardown: () => subscriberCount === 0 && channel === activeChannel,
  });
  channel = null;
}

/** Single shared Supabase channel for shift/profile updates across home + dashboard. */
export function useShiftRealtime(options?: {
  onShiftsChange?: () => void;
  onProfilesChange?: () => void;
}) {
  const onShiftsRef = useRef(options?.onShiftsChange);
  const onProfilesRef = useRef(options?.onProfilesChange);

  useEffect(() => {
    onShiftsRef.current = options?.onShiftsChange;
    onProfilesRef.current = options?.onProfilesChange;
  });

  const shiftListener = useCallback(() => {
    onShiftsRef.current?.();
  }, []);
  const profileListener = useCallback(() => {
    onProfilesRef.current?.();
  }, []);

  const wantsShifts = Boolean(options?.onShiftsChange);
  const wantsProfiles = Boolean(options?.onProfilesChange);

  useEffect(() => {
    subscriberCount += 1;

    let cancelled = false;
    void (async () => {
      await ensureSharedShiftChannel();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
      subscriberCount = Math.max(0, subscriberCount - 1);
      teardownSharedShiftChannel();
    };
  }, []);

  useEffect(() => {
    if (wantsShifts) shiftListeners.add(shiftListener);
    if (wantsProfiles) profileListeners.add(profileListener);

    return () => {
      if (wantsShifts) shiftListeners.delete(shiftListener);
      if (wantsProfiles) profileListeners.delete(profileListener);
    };
  }, [wantsShifts, wantsProfiles, shiftListener, profileListener]);
}

/** @internal Test-only introspection for listener lifecycle assertions. */
export function __getShiftRealtimeStateForTests() {
  if (process.env.VITEST !== 'true') {
    throw new Error('__getShiftRealtimeStateForTests is only available under Vitest');
  }

  return {
    shiftListenerCount: shiftListeners.size,
    profileListenerCount: profileListeners.size,
    subscriberCount,
  };
}
