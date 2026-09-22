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

const DETAIL_PATCH_KEYS = [
  'itemsToOrder',
  'branchWithdrawItems',
  'inventoryCatalogItems',
  'maintenanceTasks',
  'operational',
  'headcountToday',
  'isBranch2Day',
] as const satisfies readonly (keyof SecretarySnapshotPatch)[];

function patchHasBoardDetail(patch: SecretarySnapshotPatch): boolean {
  return DETAIL_PATCH_KEYS.some((key) => patch[key] !== undefined);
}

export type HomeBoardDetailUpdate = {
  snapshot: SecretarySnapshot;
  snapshotPatch?: SecretarySnapshotPatch;
};

export function mergeSecretarySnapshot(
  current: SecretarySnapshot,
  patch: SecretarySnapshotPatch,
): SecretarySnapshot {
  return {
    ...current,
    ...patch,
    detailStatus: patchHasBoardDetail(patch) ? 'ready' : current.detailStatus,
    operational: patch.operational
      ? { ...current.operational, ...patch.operational }
      : current.operational,
  };
}
