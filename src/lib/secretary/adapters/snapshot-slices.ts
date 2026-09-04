import { parseISO } from 'date-fns';
import { fetchTodayShifts } from '@/app/actions/daily-report-actions';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import { compileOperationalSnapshot, fetchPendingBeanOrdersInsightSlice } from '@/lib/proactive-insights/compile-operational-snapshot';
import {
  computeBranchWithdrawItems,
  computeItemsToOrder,
} from '@/lib/inventory-stock';
import { queryHomeMaintenanceTasks } from '@/lib/maintenance/fetch-home-maintenance';
import { mapInventoryRowsToCatalogSeed } from '@/lib/inventory-branch-withdraw-seed';
import { resolveSecretaryBranch2Day } from '@/lib/secretary/detect-branch2-day';
import type { SecretarySyncScope } from '@/lib/secretary/board-sync-scope';
import type { SecretarySnapshotPatch } from '@/lib/secretary/snapshot-patch';
import type { SecretaryReorderItem, SecretarySnapshot } from '@/lib/secretary/types';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export type { SecretarySnapshotPatch } from '@/lib/secretary/snapshot-patch';

function mapInventoryItems(items: SecretaryReorderItem[]) {
  const itemsToOrder = computeItemsToOrder(items).map((item) => ({
    ...item,
    id: String(item.id),
    name: String(item.name),
  }));
  const branchWithdrawItems = computeBranchWithdrawItems(items).map((item) => ({
    ...item,
    id: String(item.id),
    name: String(item.name),
  }));
  const inventoryCatalogItems = mapInventoryRowsToCatalogSeed(items);
  return { itemsToOrder, branchWithdrawItems, inventoryCatalogItems };
}

export async function fetchInventorySnapshotSlice(): Promise<
  Pick<SecretarySnapshot, 'itemsToOrder' | 'branchWithdrawItems' | 'inventoryCatalogItems'>
> {
  const admin = getSupabaseAdmin();
  const inventoryResult = await admin.from('inventory_items').select(INVENTORY_ITEM_SELECT);

  if (inventoryResult.error) {
    console.error('Supabase Error:', inventoryResult.error.message, inventoryResult.error.details);
  }

  return mapInventoryItems((inventoryResult.data ?? []) as SecretaryReorderItem[]);
}

export async function fetchBeanOrdersSnapshotSlice(opts: {
  dateIso: string;
  locale: string;
}): Promise<Pick<SecretarySnapshot, 'operational'>> {
  const pendingBeanOrders = await fetchPendingBeanOrdersInsightSlice();
  const operational = await compileOperationalSnapshot(opts);
  return {
    operational: {
      ...operational,
      pendingBeanOrders,
    },
  };
}

export async function fetchMaintenanceSnapshotSlice(
  dateIso: string,
): Promise<Pick<SecretarySnapshot, 'maintenanceTasks'>> {
  const admin = getSupabaseAdmin();
  const maintenanceTasks = await queryHomeMaintenanceTasks(admin, dateIso);
  return { maintenanceTasks };
}

export async function fetchScheduleSnapshotSlice(opts: {
  dateIso: string;
  locale: string;
}): Promise<
  Pick<SecretarySnapshot, 'operational' | 'headcountToday' | 'isBranch2Day' | 'branch2Remark'>
> {
  const date = parseISO(opts.dateIso);
  const [operational, shiftsBlock] = await Promise.all([
    compileOperationalSnapshot(opts),
    fetchTodayShifts(date),
  ]);

  const branch2 = resolveSecretaryBranch2Day(shiftsBlock.otherDutyStaff);

  return {
    operational,
    headcountToday: shiftsBlock.headcount,
    isBranch2Day: branch2.isBranch2Day,
    branch2Remark: branch2.branch2Remark,
  };
}

export async function fetchSecretarySnapshotSlices(
  opts: { dateIso: string; locale: string },
  scopes: readonly Exclude<SecretarySyncScope, 'tasks'>[],
): Promise<SecretarySnapshotPatch> {
  const patch: SecretarySnapshotPatch = {
    dateIso: opts.dateIso,
    locale: opts.locale,
  };

  await Promise.all(
    scopes.map(async (scope) => {
      if (scope === 'inventory') {
        Object.assign(patch, await fetchInventorySnapshotSlice());
      } else if (scope === 'bean_orders') {
        Object.assign(patch, await fetchBeanOrdersSnapshotSlice(opts));
      } else if (scope === 'maintenance') {
        Object.assign(patch, await fetchMaintenanceSnapshotSlice(opts.dateIso));
      } else if (scope === 'schedule') {
        Object.assign(patch, await fetchScheduleSnapshotSlice(opts));
      }
    }),
  );

  return patch;
}

export function buildSnapshotForDerive(
  dateIso: string,
  locale: string,
  patch: SecretarySnapshotPatch,
): SecretarySnapshot {
  const operational =
    patch.operational ??
    ({
      dateIso,
      dateDisplay: dateIso,
      locale,
      headcount: patch.headcountToday ?? 0,
      leaveCount: 0,
      offCount: 0,
      weeklyDays: [],
      pendingBeanOrders: [],
      upcomingHoliday: null,
    } as SecretarySnapshot['operational']);

  return {
    dateIso,
    locale,
    operational,
    itemsToOrder: patch.itemsToOrder ?? [],
    branchWithdrawItems: patch.branchWithdrawItems ?? [],
    inventoryCatalogItems: patch.inventoryCatalogItems ?? [],
    maintenanceTasks: patch.maintenanceTasks ?? [],
    isBranch2Day: patch.isBranch2Day ?? false,
    branch2Remark: patch.branch2Remark,
    headcountToday: patch.headcountToday ?? operational.headcount,
  };
}
