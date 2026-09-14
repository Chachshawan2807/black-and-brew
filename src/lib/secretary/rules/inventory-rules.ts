import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import { BRANCH_WITHDRAW_ORDER_SOURCE } from '@/lib/inventory-stock';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';

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

  return tasks;
}
