import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import { BRANCH_WITHDRAW_ORDER_SOURCE } from '@/lib/inventory-stock';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';
import { EMPTY_SECRETARY_COUNT_SESSION } from '@/lib/secretary/types';

function isBranchWithdrawPurchaseItem(source: string | null | undefined): boolean {
  return (source || 'ไม่ได้ระบุแหล่งที่มา') === BRANCH_WITHDRAW_ORDER_SOURCE;
}

export function deriveInventoryTasks(snapshot: SecretarySnapshot): DerivedTaskDraft[] {
  const tasks: DerivedTaskDraft[] = [];
  const localePrefix = `/${snapshot.locale}`;
  const purchaseReorderItems = snapshot.itemsToOrder.filter(
    (item) => !isBranchWithdrawPurchaseItem(item.source),
  );

  if (purchaseReorderItems.length > 0) {
    const names = purchaseReorderItems
      .slice(0, 5)
      .map((item) => item.name)
      .join(', ');
    const sourceRef = {
      rule: 'inventory_reorder',
      itemIds: purchaseReorderItems.map((item) => item.id),
    };
    tasks.push({
      taskType: 'inventory_reorder',
      title: `สั่งซื้อสินค้า (${purchaseReorderItems.length} รายการ)`,
      description: names,
      priority: 'normal',
      module: 'inventory',
      sourceRef,
      sourceRefHash: buildSourceRefHash('inventory_reorder', sourceRef),
      actionHref: `${localePrefix}/inventory`,
      estimatedMinutes: 45,
    });
  }

  if (snapshot.branchWithdrawItems.length > 0) {
    const names = snapshot.branchWithdrawItems
      .slice(0, 5)
      .map((item) => item.name)
      .join(', ');
    const sourceRef = {
      rule: 'branch_withdraw',
      itemIds: snapshot.branchWithdrawItems.map((item) => item.id),
    };
    tasks.push({
      taskType: 'branch_withdraw',
      title: `เบิกของสาขา 2 (${snapshot.branchWithdrawItems.length} รายการ)`,
      description: names,
      priority: 'normal',
      module: 'branch_withdraw',
      sourceRef,
      sourceRefHash: buildSourceRefHash('branch_withdraw', sourceRef),
      actionHref: `${localePrefix}/inventory/branch-withdraw`,
      estimatedMinutes: 40,
    });
  }

  const { countSession } = snapshot;
  const count = countSession ?? EMPTY_SECRETARY_COUNT_SESSION;
  if (count.totalExactCountItems > 0 && !count.isFullyCountedToday) {
    const remaining = count.totalExactCountItems - count.countedTodayCount;
    const sourceRef = {
      rule: 'inventory_count_due',
      totalExactCountItems: count.totalExactCountItems,
      countedTodayCount: count.countedTodayCount,
    };
    tasks.push({
      taskType: 'inventory_count_due',
      title: `ตรวจนับสต็อกวันนี้ (เหลือ ${remaining} รายการ)`,
      description: `นับแล้ว ${count.countedTodayCount}/${count.totalExactCountItems} รายการ`,
      priority: remaining > 5 ? 'urgent' : 'normal',
      module: 'inventory_count',
      sourceRef,
      sourceRefHash: buildSourceRefHash('inventory_count_due', sourceRef),
      actionHref: `${localePrefix}/inventory/count`,
      estimatedMinutes: 30,
    });
  }

  if (count.mismatchCount > 0) {
    const sourceRef = {
      rule: 'inventory_accuracy_review',
      mismatchCount: count.mismatchCount,
    };
    tasks.push({
      taskType: 'inventory_accuracy_review',
      title: `ตรวจความแม่นยำการนับ (${count.mismatchCount} รายการ)`,
      description: 'มีรายการที่นับไม่ตรงกับสต็อกในระบบ',
      priority: 'urgent',
      module: 'inventory_accuracy',
      sourceRef,
      sourceRefHash: buildSourceRefHash('inventory_accuracy_review', sourceRef),
      actionHref: `${localePrefix}/inventory/count`,
      estimatedMinutes: 20,
    });
  }

  return tasks;
}
