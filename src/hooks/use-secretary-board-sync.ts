'use client';

import { useCallback, useEffect, useRef } from 'react';
import { syncAndFetchSecretaryBoard } from '@/app/actions/secretary-actions';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import {
  findSupabaseChannelByName,
  isSupabaseChannelReusable,
  prepareSupabaseChannelName,
  scheduleSupabaseChannelTeardown,
} from '@/lib/supabase-realtime-channel';
import {
  resolveSecretaryBoardSyncPlan,
  SECRETARY_BOARD_SYNC_DEBOUNCE_MS,
  SECRETARY_REALTIME_TABLES,
  type SecretaryRealtimeTable,
} from '@/lib/secretary/board-sync-scope';
import type { SecretarySnapshotPatch } from '@/lib/secretary/snapshot-patch';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { watchBangkokWorkDate } from '@/lib/secretary/watch-bangkok-work-date';

export type BoardSyncPayload = {
  tasks: SecretaryTask[];
  snapshot?: SecretarySnapshot;
  snapshotPatch?: SecretarySnapshotPatch;
};

type Listener = (payload: BoardSyncPayload) => void;

type SyncRegistration = {
  listener: Listener;
  getDateIso: () => string;
  getLocale: () => string;
  getBaseSnapshot: () => SecretarySnapshot | undefined;
};

const registrations = new Set<SyncRegistration>();
const invalidationListeners = new Set<() => void>();

let channel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
let channelStarting: Promise<void> | null = null;
let teardownCancel: (() => void) | null = null;
let syncInFlight: Promise<void> | null = null;
let needsResync = false;
let pendingTables = new Set<SecretaryRealtimeTable>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let forceFullNextSync = true;

function isSecretaryRealtimeTable(table: string): table is SecretaryRealtimeTable {
  return (SECRETARY_REALTIME_TABLES as readonly string[]).includes(table);
}

function cancelSharedChannelTeardown() {
  teardownCancel?.();
  teardownCancel = null;
}

function emitInvalidation() {
  invalidationListeners.forEach((listener) => {
    listener();
  });
}

export function subscribeSecretaryInvalidation(listener: () => void): () => void {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}

function scheduleDebouncedBoardSync() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runAllBoardSyncs();
  }, SECRETARY_BOARD_SYNC_DEBOUNCE_MS);
}

async function ensureSharedSecretaryChannel() {
  cancelSharedChannelTeardown();

  const existing = findSupabaseChannelByName('bb-secretary-shared');
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

    const prepared = await prepareSupabaseChannelName('bb-secretary-shared');
    if (prepared.reused) {
      channel = prepared.reused;
      return;
    }

    const notify = (payload: { table?: string }) => {
      const table = payload.table;
      if (table && isSecretaryRealtimeTable(table)) {
        pendingTables.add(table);
      }
      emitInvalidation();
      scheduleDebouncedBoardSync();
    };

    let nextChannel = supabase.channel('bb-secretary-shared');
    for (const table of SECRETARY_REALTIME_TABLES) {
      nextChannel = nextChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        notify,
      );
    }
    channel = nextChannel.subscribe();
  })();

  try {
    await channelStarting;
  } finally {
    channelStarting = null;
  }
}

function teardownSharedSecretaryChannel() {
  if (subscriberCount > 0 || !channel) return;

  cancelSharedChannelTeardown();
  const activeChannel = channel;
  teardownCancel = scheduleSupabaseChannelTeardown(activeChannel, {
    shouldTeardown: () => subscriberCount === 0 && channel === activeChannel,
  });
  channel = null;
}

async function runAllBoardSyncs() {
  if (registrations.size === 0) return;

  if (syncInFlight) {
    needsResync = true;
    await syncInFlight;
    if (needsResync) {
      needsResync = false;
      await runAllBoardSyncs();
    }
    return;
  }

  const changedTables = [...pendingTables];
  pendingTables = new Set();
  const useFullSync = forceFullNextSync;
  forceFullNextSync = false;

  syncInFlight = (async () => {
    await Promise.all(
      [...registrations].map(async (registration) => {
        const dateIso = registration.getDateIso();
        const locale = registration.getLocale();
        if (!dateIso || !locale) return;

        const plan = resolveSecretaryBoardSyncPlan(changedTables, { forceFull: useFullSync });
        const result = await syncAndFetchSecretaryBoard({
          dateIso,
          locale,
          plan,
          baseSnapshot: registration.getBaseSnapshot(),
        });
        if (!result.success || !result.tasks) return;

        registration.listener({
          tasks: result.tasks,
          snapshot: result.snapshot,
          snapshotPatch: result.snapshotPatch,
        });
      }),
    );
  })();

  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
    if (needsResync) {
      needsResync = false;
      await runAllBoardSyncs();
    }
  }
}

export function requestSecretaryBoardFullSync() {
  forceFullNextSync = true;
  pendingTables.clear();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  void runAllBoardSyncs();
}

export function useSecretaryBoardSync(options: {
  dateIso: string;
  locale: string;
  onSync: (payload: BoardSyncPayload) => void;
  onWorkDateChange?: (dateIso: string) => void;
  getBaseSnapshot?: () => SecretarySnapshot;
  /** Skip the mount full-sync when SSR already hydrated the board. */
  skipInitialFullSync?: boolean;
}) {
  const onSyncRef = useRef(options.onSync);
  const onWorkDateChangeRef = useRef(options.onWorkDateChange);
  const dateIsoRef = useRef(options.dateIso);
  const localeRef = useRef(options.locale);
  const getBaseSnapshotRef = useRef(options.getBaseSnapshot);
  const skipInitialFullSyncRef = useRef(options.skipInitialFullSync ?? false);
  const skipNextDateLocaleSyncRef = useRef(options.skipInitialFullSync ?? false);

  useEffect(() => {
    onSyncRef.current = options.onSync;
    onWorkDateChangeRef.current = options.onWorkDateChange;
    dateIsoRef.current = options.dateIso;
    localeRef.current = options.locale;
    getBaseSnapshotRef.current = options.getBaseSnapshot;
    skipInitialFullSyncRef.current = options.skipInitialFullSync ?? false;
  });

  const listener = useCallback<Listener>((payload) => {
    onSyncRef.current(payload);
  }, []);

  useEffect(() => {
    const registration: SyncRegistration = {
      listener,
      getDateIso: () => dateIsoRef.current,
      getLocale: () => localeRef.current,
      getBaseSnapshot: () => getBaseSnapshotRef.current?.(),
    };

    registrations.add(registration);
    subscriberCount += 1;

    let cancelled = false;
    void (async () => {
      await ensureSharedSecretaryChannel();
      if (cancelled) return;
      if (!skipInitialFullSyncRef.current) {
        requestSecretaryBoardFullSync();
      }
    })();

    return () => {
      cancelled = true;
      registrations.delete(registration);
      subscriberCount = Math.max(0, subscriberCount - 1);
      teardownSharedSecretaryChannel();
    };
  }, [listener]);

  useEffect(() => {
    if (skipNextDateLocaleSyncRef.current) {
      skipNextDateLocaleSyncRef.current = false;
      return;
    }
    requestSecretaryBoardFullSync();
  }, [options.dateIso, options.locale]);

  useEffect(() => {
    return watchBangkokWorkDate((nextDateIso) => {
      onWorkDateChangeRef.current?.(nextDateIso);
      dateIsoRef.current = nextDateIso;
      requestSecretaryBoardFullSync();
    });
  }, []);
}
