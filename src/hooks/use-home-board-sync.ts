'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  hydrateSecretaryBoardSnapshot,
  syncAndFetchSecretaryBoard,
} from '@/app/actions/home-actions';
import { isMinimalSecretaryBoardSnapshot } from '@/lib/secretary/minimal-board-snapshot';
import type { SecretarySyncScope } from '@/lib/secretary/board-sync-scope';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import {
  findSupabaseChannelByName,
  isSupabaseChannelReusable,
  prepareSupabaseChannelName,
  scheduleSupabaseChannelTeardown,
} from '@/lib/supabase-realtime-channel';
import {
  resolveSecretaryBoardSyncDebounceMs,
  resolveSecretaryBoardSyncPlan,
  SECRETARY_REALTIME_TABLES,
  type SecretaryBoardSyncKind,
  type SecretaryRealtimeTable,
} from '@/lib/secretary/board-sync-scope';
import type { SecretarySnapshotPatch } from '@/lib/secretary/snapshot-patch';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { countSidebarPendingSecretaryTasks } from '@/lib/secretary/count-sidebar-pending-tasks';
import { watchBangkokWorkDate } from '@/lib/secretary/watch-bangkok-work-date';
import { homePerfFullSyncEnd, homePerfFullSyncStart } from '@/lib/perf/home-board-perf';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';

export type BoardSyncPayload = {
  tasks: SecretaryTask[];
  snapshot?: SecretarySnapshot;
  snapshotPatch?: SecretarySnapshotPatch;
  syncKind?: SecretaryBoardSyncKind;
};

type Listener = (payload: BoardSyncPayload) => void;

type SyncRegistration = {
  listener: Listener;
  getDateIso: () => string;
  getLocale: () => string;
  getBaseSnapshot: () => SecretarySnapshot | undefined;
  getCurrentTasks: () => SecretaryTask[];
  getHydrationScopes: () => Exclude<SecretarySyncScope, 'tasks'>[];
};

const registrations = new Set<SyncRegistration>();
const sidebarPendingCountListeners = new Set<(count: number) => void>();

let channel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
let channelStarting: Promise<void> | null = null;
let teardownCancel: (() => void) | null = null;
let syncInFlight: Promise<void> | null = null;
let needsResync = false;
let pendingTables = new Set<SecretaryRealtimeTable>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let forceFullNextSync = true;
let snapshotHydrateInFlight: Promise<void> | null = null;

async function hydrateBoardSnapshots(
  targets: SyncRegistration[],
  opts?: { scopes?: Exclude<SecretarySyncScope, 'tasks'>[]; forceFull?: boolean },
) {
  await Promise.all(
    targets.map(async (registration) => {
      const dateIso = registration.getDateIso();
      const locale = registration.getLocale();
      if (!dateIso || !locale) return;

      const baseSnapshot = registration.getBaseSnapshot();
      if (
        !opts?.scopes &&
        !opts?.forceFull &&
        baseSnapshot &&
        !isMinimalSecretaryBoardSnapshot(baseSnapshot)
      ) {
        return;
      }

      const taskScopes = registration.getHydrationScopes();
      const scopes =
        opts?.scopes ??
        (opts?.forceFull || taskScopes.length === 0 ? undefined : taskScopes);

      const result = await hydrateSecretaryBoardSnapshot({
        dateIso,
        locale,
        scopes: scopes?.length ? scopes : undefined,
        baseSnapshot,
      });

      if (!result.success || !result.snapshot) return;

      registration.listener({
        tasks: registration.getCurrentTasks(),
        snapshot: result.snapshot,
        snapshotPatch: result.snapshotPatch,
        syncKind: scopes?.length ? 'scoped' : 'full',
      });
    }),
  );
}

function isSecretaryRealtimeTable(table: string): table is SecretaryRealtimeTable {
  return (SECRETARY_REALTIME_TABLES as readonly string[]).includes(table);
}

function cancelSharedChannelTeardown() {
  teardownCancel?.();
  teardownCancel = null;
}

export function publishHomeSidebarPendingCount(
  tasks: readonly SecretaryTask[],
  dateIso: string,
): void {
  const count = countSidebarPendingSecretaryTasks(tasks, dateIso);
  sidebarPendingCountListeners.forEach((listener) => {
    listener(count);
  });
}

export function subscribeHomeSidebarPendingCount(listener: (count: number) => void): () => void {
  sidebarPendingCountListeners.add(listener);
  return () => {
    sidebarPendingCountListeners.delete(listener);
  };
}

function scheduleDebouncedBoardSync() {
  const delayMs = resolveSecretaryBoardSyncDebounceMs([...pendingTables]);
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runAllBoardSyncs();
  }, delayMs);
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
    if (useFullSync) {
      homePerfFullSyncStart();
    }

    let fullSyncOk = true;
    let fullSyncTaskCount = 0;
    let fullSyncKind: string | undefined;

    if (useFullSync && registrations.size > 0) {
      await hydrateBoardSnapshots([...registrations], { forceFull: true });
    }

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
        if (!result.success || !result.tasks) {
          if (useFullSync) fullSyncOk = false;
          return;
        }

        if (useFullSync) {
          fullSyncTaskCount = result.tasks.length;
          fullSyncKind = plan.kind;
        }

        registration.listener({
          tasks: result.tasks,
          snapshot: result.snapshot,
          snapshotPatch: result.snapshotPatch,
          syncKind: plan.kind,
        });
        publishHomeSidebarPendingCount(result.tasks, dateIso);
      }),
    );

    if (useFullSync) {
      homePerfFullSyncEnd({
        ok: fullSyncOk,
        taskCount: fullSyncTaskCount,
        syncKind: fullSyncKind,
      });
    }
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

export function requestHomeBoardFullSync() {
  forceFullNextSync = true;
  pendingTables.clear();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  void runAllBoardSyncs();
}

/** Warm snapshot slices for overlays before full derived sync finishes. */
export function requestHomeBoardSnapshotHydrate(
  scopes?: Exclude<SecretarySyncScope, 'tasks'>[],
) {
  if (registrations.size === 0) return;

  const run = async () => {
    await hydrateBoardSnapshots([...registrations], { scopes });
  };

  if (snapshotHydrateInFlight) {
    void snapshotHydrateInFlight.then(() => run());
    return;
  }

  snapshotHydrateInFlight = run().finally(() => {
    snapshotHydrateInFlight = null;
  });
}

export function useHomeBoardSync(options: {
  dateIso: string;
  locale: string;
  onSync: (payload: BoardSyncPayload) => void;
  onWorkDateChange?: (dateIso: string) => void;
  getBaseSnapshot?: () => SecretarySnapshot;
  getCurrentTasks?: () => SecretaryTask[];
  getHydrationScopes?: () => Exclude<SecretarySyncScope, 'tasks'>[];
  /** Skip the mount full-sync when SSR already hydrated the board. */
  skipInitialFullSync?: boolean;
}) {
  const onSyncRef = useRef(options.onSync);
  const onWorkDateChangeRef = useRef(options.onWorkDateChange);
  const dateIsoRef = useRef(options.dateIso);
  const localeRef = useRef(options.locale);
  const getBaseSnapshotRef = useRef(options.getBaseSnapshot);
  const getCurrentTasksRef = useRef(options.getCurrentTasks);
  const getHydrationScopesRef = useRef(options.getHydrationScopes);
  const skipInitialFullSyncRef = useRef(options.skipInitialFullSync ?? false);
  const skipNextDateLocaleSyncRef = useRef(options.skipInitialFullSync ?? false);

  useEffect(() => {
    onSyncRef.current = options.onSync;
    onWorkDateChangeRef.current = options.onWorkDateChange;
    dateIsoRef.current = options.dateIso;
    localeRef.current = options.locale;
    getBaseSnapshotRef.current = options.getBaseSnapshot;
    getCurrentTasksRef.current = options.getCurrentTasks;
    getHydrationScopesRef.current = options.getHydrationScopes;
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
      getCurrentTasks: () => getCurrentTasksRef.current?.() ?? [],
      getHydrationScopes: () => getHydrationScopesRef.current?.() ?? [],
    };

    registrations.add(registration);
    subscriberCount += 1;

    let cancelled = false;
    void (async () => {
      await ensureSharedSecretaryChannel();
      if (cancelled) return;
      if (!skipInitialFullSyncRef.current) {
        scheduleIdleWork(() => {
          if (!cancelled) requestHomeBoardFullSync();
        }, { timeout: 800 });
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
    requestHomeBoardFullSync();
  }, [options.dateIso, options.locale]);

  useEffect(() => {
    return watchBangkokWorkDate((nextDateIso) => {
      onWorkDateChangeRef.current?.(nextDateIso);
      dateIsoRef.current = nextDateIso;
      requestHomeBoardFullSync();
    });
  }, []);
}
