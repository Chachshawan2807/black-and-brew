'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';

type Listener = () => void;

let shiftListeners = new Set<Listener>();
let profileListeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
let channelStarting: Promise<void> | null = null;
let teardownTimer: ReturnType<typeof setTimeout> | null = null;

const SHIFT_CHANNEL_TEARDOWN_DELAY_MS = 50;

function cancelSharedShiftChannelTeardown() {
  if (!teardownTimer) return;
  clearTimeout(teardownTimer);
  teardownTimer = null;
}

async function ensureSharedShiftChannel() {
  cancelSharedShiftChannelTeardown();

  if (channel) return;
  if (channelStarting) {
    await channelStarting;
    return;
  }

  channelStarting = (async () => {
    await ensureSupabaseSession();
    if (channel) return;

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
  teardownTimer = setTimeout(() => {
    teardownTimer = null;
    if (subscriberCount > 0 || !channel) return;
    void supabase.removeChannel(channel);
    channel = null;
  }, SHIFT_CHANNEL_TEARDOWN_DELAY_MS);
}

function createStableListener(getCurrent: () => Listener | undefined): Listener {
  return () => getCurrent()?.();
}

/** Single shared Supabase channel for shift/profile updates across home + dashboard. */
export function useShiftRealtime(options?: {
  onShiftsChange?: () => void;
  onProfilesChange?: () => void;
}) {
  const onShiftsRef = useRef(options?.onShiftsChange);
  const onProfilesRef = useRef(options?.onProfilesChange);
  onShiftsRef.current = options?.onShiftsChange;
  onProfilesRef.current = options?.onProfilesChange;

  const shiftListenerRef = useRef<Listener | null>(null);
  const profileListenerRef = useRef<Listener | null>(null);

  if (!shiftListenerRef.current) {
    shiftListenerRef.current = createStableListener(() => onShiftsRef.current);
  }
  if (!profileListenerRef.current) {
    profileListenerRef.current = createStableListener(() => onProfilesRef.current);
  }

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
    const shiftListener = shiftListenerRef.current!;
    const profileListener = profileListenerRef.current!;

    if (wantsShifts) shiftListeners.add(shiftListener);
    if (wantsProfiles) profileListeners.add(profileListener);

    return () => {
      if (wantsShifts) shiftListeners.delete(shiftListener);
      if (wantsProfiles) profileListeners.delete(profileListener);
    };
  }, [wantsShifts, wantsProfiles]);
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
