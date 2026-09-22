import { isMinimalSecretaryBoardSnapshot } from '@/lib/secretary/minimal-board-snapshot';
import {
  mergeSecretarySnapshot,
  type SecretarySnapshotPatch,
} from '@/lib/secretary/snapshot-patch';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export type SecretaryBoardSyncUpdate = {
  tasks?: SecretaryTask[];
  snapshot?: SecretarySnapshot;
  snapshotPatch?: SecretarySnapshotPatch;
};

type BoardSlice = {
  tasks: SecretaryTask[];
  snapshot: SecretarySnapshot;
};

/**
 * Applies a parallel task refresh and detail update without letting a stale
 * placeholder snapshot replace detail that already arrived.
 * A patch merges onto the current snapshot. A full snapshot replaces it.
 */
export function applySecretaryBoardSync(
  prev: BoardSlice,
  update: SecretaryBoardSyncUpdate,
): BoardSlice {
  const tasks = update.tasks ?? prev.tasks;

  if (update.snapshotPatch) {
    return {
      tasks,
      snapshot: mergeSecretarySnapshot(prev.snapshot, update.snapshotPatch),
    };
  }

  if (!update.snapshot) {
    return { tasks, snapshot: prev.snapshot };
  }

  const incomingMinimal = isMinimalSecretaryBoardSnapshot(update.snapshot);
  const currentReady = !isMinimalSecretaryBoardSnapshot(prev.snapshot);
  if (incomingMinimal && currentReady) {
    return { tasks, snapshot: prev.snapshot };
  }

  return { tasks, snapshot: update.snapshot };
}
