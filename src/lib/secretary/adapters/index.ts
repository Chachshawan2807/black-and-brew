import { parseISO } from 'date-fns';
import { cache } from 'react';
import { fetchTodayShifts } from '@/app/actions/daily-report-actions';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import {
  computeBranchWithdrawItems,
  computeItemsToOrder,
} from '@/lib/inventory-stock';
import { queryHomeMaintenanceTasks } from '@/lib/maintenance/fetch-home-maintenance';
import { compileOperationalSnapshot } from '@/lib/proactive-insights/compile-operational-snapshot';
import { detectBranch2Day } from '@/lib/secretary/detect-branch2-day';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryReorderItem, SecretarySnapshot } from '@/lib/secretary/types';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const fetchSecretarySnapshotCached = cache(async (dateIso: string, locale: string): Promise<SecretarySnapshot> => {
  const date = parseISO(dateIso);

  const admin = getSupabaseAdmin();
  const [operational, inventoryResult, maintenanceTasks, shiftsBlock] = await Promise.all([
    compileOperationalSnapshot({ dateIso, locale }),
    admin.from('inventory_items').select(INVENTORY_ITEM_SELECT),
    queryHomeMaintenanceTasks(admin, dateIso),
    fetchTodayShifts(date),
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

  const branchShifts = shiftsBlock.otherDutyStaff.map((entry) => ({
    metadata: { location: entry.shiftText },
  }));

  const branch2 = detectBranch2Day(branchShifts);

  return {
    dateIso,
    locale,
    operational,
    itemsToOrder,
    branchWithdrawItems,
    maintenanceTasks,
    isBranch2Day: branch2.isBranch2Day,
    branch2Remark: branch2.branch2Remark,
    headcountToday: shiftsBlock.headcount,
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
