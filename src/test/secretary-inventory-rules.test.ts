import { describe, expect, test } from 'vitest';
import { BRANCH_WITHDRAW_ORDER_SOURCE } from '@/lib/inventory-stock';
import { deriveInventoryTasks } from '@/lib/secretary/rules/inventory-rules';
import type { SecretarySnapshot } from '@/lib/secretary/types';

function snapshot(
  itemsToOrder: SecretarySnapshot['itemsToOrder'],
  branchWithdrawItems: SecretarySnapshot['branchWithdrawItems'] = [],
): SecretarySnapshot {
  return {
    dateIso: '2026-08-29',
    locale: 'th',
    operational: {
      dateIso: '2026-08-29',
      dateDisplay: '29-08-2026',
      locale: 'th',
      headcount: 0,
      leaveCount: 0,
      offCount: 0,
      weeklyDays: [],
      pendingBeanOrders: [],
      upcomingHoliday: null,
    },
    itemsToOrder,
    branchWithdrawItems,
    maintenanceTasks: [],
    isBranch2Day: false,
    headcountToday: 0,
  };
}

describe('deriveInventoryTasks', () => {
  test('purchase reorder task excludes branch-2 source items from count', () => {
    const tasks = deriveInventoryTasks(
      snapshot(
        [
          {
            id: 'branch-low',
            name: 'นม',
            source: BRANCH_WITHDRAW_ORDER_SOURCE,
            stock: 2,
            order_point: 5,
            target_stock: 10,
            computedOrderQty: 8,
          },
          {
            id: 'makro-low',
            name: 'กาแฟ',
            source: 'Makro',
            stock: 1,
            order_point: 5,
            target_stock: 10,
            computedOrderQty: 9,
          },
        ],
        [
          {
            id: 'branch-low',
            name: 'นม',
            source: BRANCH_WITHDRAW_ORDER_SOURCE,
            stock: 2,
            order_point: 5,
            target_stock: 10,
            computedOrderQty: 8,
          },
        ],
      ),
    );

    const purchaseTask = tasks.find((task) => task.taskType === 'inventory_reorder');
    const withdrawTask = tasks.find((task) => task.taskType === 'branch_withdraw');

    expect(purchaseTask?.title).toBe('สั่งซื้อสินค้า (1 รายการ)');
    expect(withdrawTask?.title).toBe('เบิกของสาขา 2 (1 รายการ)');
  });
});
