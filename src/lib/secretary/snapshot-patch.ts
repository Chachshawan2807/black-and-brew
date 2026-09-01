import type { SecretarySnapshot } from '@/lib/secretary/types';

export type SecretarySnapshotPatch = Partial<
  Pick<
    SecretarySnapshot,
    | 'itemsToOrder'
    | 'branchWithdrawItems'
    | 'inventoryCatalogItems'
    | 'maintenanceTasks'
    | 'operational'
    | 'isBranch2Day'
    | 'branch2Remark'
    | 'headcountToday'
    | 'dateIso'
    | 'locale'
  >
>;

export function mergeSecretarySnapshot(
  current: SecretarySnapshot,
  patch: SecretarySnapshotPatch,
): SecretarySnapshot {
  return {
    ...current,
    ...patch,
    operational: patch.operational
      ? { ...current.operational, ...patch.operational }
      : current.operational,
  };
}
