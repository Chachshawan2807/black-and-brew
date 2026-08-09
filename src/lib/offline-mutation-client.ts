/** Client orchestration for offline mutation queue + Background Sync registration. */

import {
  enqueueOfflineMutation,
  listOfflineMutations,
  purgeUnownedOfflineMutations,
  removeOfflineMutation,
} from '@/lib/offline-mutation-queue';
import { replayOfflineMutation } from '@/lib/offline-mutation-sync';
import {
  getClientOfflineAuthSessionId,
  isOfflineMutationOwnedByCurrentSession,
} from '@/lib/offline-auth-session';
import {
  OFFLINE_STATUS_CHANGED_EVENT,
  type OfflineStatusSnapshot,
} from '@/lib/offline-status';
import {
  isOfflineRetryableError,
  isOfflineRetryableResult,
  OFFLINE_MUTATION_SYNC_TAG,
  type OfflineMutation,
  type OfflineMutationInput,
} from '@/lib/offline-mutation-types';

export const FLUSH_OFFLINE_MUTATIONS_EVENT = 'bb-flush-offline-mutations';
export { OFFLINE_STATUS_CHANGED_EVENT };
export type { OfflineStatusSnapshot };

let flushInFlight: Promise<OfflineFlushResult> | null = null;
let isSyncingOfflineMutations = false;
let lastOfflineSyncError: string | null = null;

export type OfflineFlushResult = {
  flushed: number;
  remaining: number;
  stoppedOnError?: string;
};

export function isClientOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export async function countOwnedPendingOfflineMutations(): Promise<number> {
  const currentAuthSessionId = getClientOfflineAuthSessionId();
  const queue = await listOfflineMutations();
  return queue.filter((mutation) =>
    isOfflineMutationOwnedByCurrentSession(mutation, currentAuthSessionId),
  ).length;
}

export async function getOfflineStatusSnapshot(): Promise<OfflineStatusSnapshot> {
  return {
    isOnline: isClientOnline(),
    pendingCount: await countOwnedPendingOfflineMutations(),
    isSyncing: isSyncingOfflineMutations,
    lastSyncError: lastOfflineSyncError,
  };
}

function publishOfflineStatus(snapshot: OfflineStatusSnapshot): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(OFFLINE_STATUS_CHANGED_EVENT, { detail: snapshot }),
  );
}

export async function refreshOfflineStatus(): Promise<OfflineStatusSnapshot> {
  const snapshot = await getOfflineStatusSnapshot();
  publishOfflineStatus(snapshot);
  return snapshot;
}

export async function registerOfflineMutationSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    }).sync;
    if (syncManager?.register) {
      await syncManager.register(OFFLINE_MUTATION_SYNC_TAG);
    }
  } catch (error) {
    console.warn('[offline-mutation] Background Sync registration skipped:', error);
  }
}

export async function queueOfflineMutation(
  mutation: OfflineMutationInput,
): Promise<OfflineMutation> {
  const authSessionId = getClientOfflineAuthSessionId();
  const entry = await enqueueOfflineMutation({
    ...mutation,
    authSessionId: mutation.authSessionId ?? authSessionId,
  });
  await registerOfflineMutationSync();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FLUSH_OFFLINE_MUTATIONS_EVENT));
    await refreshOfflineStatus();
  }
  return entry;
}

export async function flushOfflineMutations(): Promise<OfflineFlushResult> {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    isSyncingOfflineMutations = true;
    lastOfflineSyncError = null;
    await refreshOfflineStatus();

    const currentAuthSessionId = getClientOfflineAuthSessionId();
    if (currentAuthSessionId) {
      await purgeUnownedOfflineMutations(currentAuthSessionId);
    }

    let flushed = 0;
    const queue = await listOfflineMutations();
    let result: OfflineFlushResult;

    try {
      for (const mutation of queue) {
        if (!isOfflineMutationOwnedByCurrentSession(mutation, currentAuthSessionId)) {
          await removeOfflineMutation(mutation.id);
          continue;
        }

        const replayResult = await replayOfflineMutation(mutation);
        if (!replayResult.success) {
          if (!isOfflineRetryableResult(replayResult, isClientOnline())) {
            await removeOfflineMutation(mutation.id);
            continue;
          }
          lastOfflineSyncError = replayResult.error ?? 'Sync failed';
          result = {
            flushed,
            remaining: queue.length - flushed,
            stoppedOnError: replayResult.error,
          };
          return result;
        }

        await removeOfflineMutation(mutation.id);
        flushed += 1;
      }

      result = {
        flushed,
        remaining: (await listOfflineMutations()).length,
      };
      return result;
    } finally {
      isSyncingOfflineMutations = false;
      await refreshOfflineStatus();
    }
  })().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}

export function shouldQueueMutationError(error: unknown): boolean {
  return isOfflineRetryableError(error, isClientOnline());
}

export function shouldQueueMutationResult(result: { success: boolean; error?: string }): boolean {
  return isOfflineRetryableResult(result, isClientOnline());
}

export function installOfflineMutationListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const flush = () => {
    void flushOfflineMutations();
  };

  const onOnline = () => {
    void refreshOfflineStatus();
    flush();
  };
  const onOffline = () => {
    void refreshOfflineStatus();
  };
  const onCustomFlush = () => flush();
  const onServiceWorkerMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string } | undefined;
    if (data?.type === 'FLUSH_OFFLINE_MUTATIONS') flush();
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  window.addEventListener(FLUSH_OFFLINE_MUTATIONS_EVENT, onCustomFlush);
  navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage);

  void refreshOfflineStatus();
  if (isClientOnline()) {
    void flushOfflineMutations();
  }

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    window.removeEventListener(FLUSH_OFFLINE_MUTATIONS_EVENT, onCustomFlush);
    navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage);
  };
}
