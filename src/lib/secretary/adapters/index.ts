import { parseISO } from 'date-fns';
import { cache } from 'react';
import { fetchTodayShifts } from '@/lib/daily-report';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import {
  computeBranchWithdrawItems,
  computeItemsToOrder,
} from '@/lib/inventory-stock';
import { queryHomeMaintenanceTasks } from '@/lib/maintenance/fetch-home-maintenance';
import {
  compileOperationalSnapshot,
  defaultOperationalSnapshotDeps,
} from '@/lib/proactive-insights/compile-operational-snapshot';
import { mapInventoryRowsToCatalogSeed } from '@/lib/inventory-branch-withdraw-seed';
import { resolveSecretaryBranch2Day } from '@/lib/secretary/detect-branch2-day';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import {
  EMPTY_SECRETARY_COUNT_SESSION,
  type SecretaryReorderItem,
  type SecretarySnapshot,
} from '@/lib/secretary/types';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const fetchSecretarySnapshotCached = cache(async (dateIso: string, locale: string): Promise<SecretarySnapshot> => {
  const date = parseISO(dateIso);

  const admin = getSupabaseAdmin();
  const shiftsPromise = fetchTodayShifts(date);
  const [shiftsBlock, operational, inventoryResult, maintenanceTasks] = await Promise.all([
    shiftsPromise,
    shiftsPromise.then((shifts) =>
      compileOperationalSnapshot(
        { dateIso, locale },
        {
          ...defaultOperationalSnapshotDeps,
          fetchShifts: async () => shifts,
        },
      ),
    ),
    admin.from('inventory_items').select(INVENTORY_ITEM_SELECT),
    queryHomeMaintenanceTasks(admin, dateIso),
  ]);

  if (inventoryResult.error) {
    console.error('Supabase Error:', inventoryResult.error.message, inventoryResult.error.details);
  }

  const items = (inventoryResult.data ?? []) as SecretaryReorderItem[];
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

  const branch2 = resolveSecretaryBranch2Day(shiftsBlock.otherDutyStaff);

  return {
    dateIso,
    locale,
    operational,
    itemsToOrder,
    branchWithdrawItems,
    inventoryCatalogItems,
    maintenanceTasks,
    isBranch2Day: branch2.isBranch2Day,
    branch2Remark: branch2.branch2Remark,
    headcountToday: shiftsBlock.headcount,
    countSession: EMPTY_SECRETARY_COUNT_SESSION,
  };
});

export async function fetchSecretarySnapshot(opts?: {
  dateIso?: string;
  locale?: string;
}): Promise<SecretarySnapshot> {
  const dateIso = opts?.dateIso ?? todayIsoBkk();
  const locale = opts?.locale ?? 'th';
  return fetchSecretarySnapshotCached(dateIso, locale);
}
