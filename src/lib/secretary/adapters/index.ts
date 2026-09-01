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
import { mapInventoryRowsToCatalogSeed } from '@/lib/inventory-branch-withdraw-seed';
import { isCountMatch } from '@/lib/inventory-count-accuracy';
import {
  buildTodayCountStatusFromVerifications,
  getBangkokTodayUtcBounds,
  type CountVerificationRow,
} from '@/lib/inventory-count-today';
import { resolveSecretaryBranch2Day } from '@/lib/secretary/detect-branch2-day';
import { SECRETARY_FOCUS_STAFF_NAME } from '@/lib/secretary/manager-day-config';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryReorderItem, SecretarySnapshot } from '@/lib/secretary/types';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const fetchSecretarySnapshotCached = cache(async (dateIso: string, locale: string): Promise<SecretarySnapshot> => {
  const date = parseISO(dateIso);

  const admin = getSupabaseAdmin();
  const { startUtc, endUtc } = getBangkokTodayUtcBounds();
  const [operational, inventoryResult, maintenanceTasks, shiftsBlock, countVerificationsResult] =
    await Promise.all([
    compileOperationalSnapshot({ dateIso, locale }),
    admin.from('inventory_items').select(INVENTORY_ITEM_SELECT),
    queryHomeMaintenanceTasks(admin, dateIso),
    fetchTodayShifts(date),
    admin
      .from('inventory_count_verifications')
      .select('inventory_item_id, counted_at, counted_qty, system_stock_qty')
      .gte('counted_at', startUtc)
      .lte('counted_at', endUtc),
  ]);

  if (inventoryResult.error) {
    console.error('Supabase Error:', inventoryResult.error.message, inventoryResult.error.details);
  }
  if (countVerificationsResult.error) {
    console.error(
      'Supabase Error:',
      countVerificationsResult.error.message,
      countVerificationsResult.error.details,
    );
  }

  const items = (inventoryResult.data ?? []) as SecretaryReorderItem[];
  const exactCountItems = items.filter((item) => item.count_policy === 'exact_count');
  const verificationRows = (countVerificationsResult.data ?? []) as CountVerificationRow[];
  const countStatus = buildTodayCountStatusFromVerifications(
    verificationRows,
    exactCountItems.length,
  );
  const mismatchCount = verificationRows.filter(
    (row) => !isCountMatch(Number(row.counted_qty), Number(row.system_stock_qty)),
  ).length;
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

  const branch2 = resolveSecretaryBranch2Day(
    shiftsBlock.otherDutyStaff,
    SECRETARY_FOCUS_STAFF_NAME,
  );

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
    countSession: {
      totalExactCountItems: exactCountItems.length,
      countedTodayCount: countStatus.session.countedTodayCount,
      mismatchCount,
      isFullyCountedToday: countStatus.session.isFullyCountedToday,
    },
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
