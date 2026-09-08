import { describe, expect, test } from 'vitest';
import { deriveInsightBridgeTasks } from '@/lib/secretary/rules/insight-rules';
import {
  formatSecretaryBeanInventoryBridgeDescription,
  isSecretaryBeanInventoryBridgeTask,
  resolveSecretaryBeanInventoryBridgeSourceRef,
} from '@/lib/secretary/format-bean-inventory-bridge-description';
import { resolveSecretaryTaskDetailText } from '@/lib/secretary/resolve-task-detail-text';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

function snapshot(
  overrides: Partial<SecretarySnapshot> = {},
): SecretarySnapshot {
  return {
    dateIso: '2026-09-08',
    locale: 'th',
    operational: {
      dateIso: '2026-09-08',
      dateDisplay: '08/09/2026',
      locale: 'th',
      headcount: 4,
      leaveCount: 0,
      offCount: 0,
      weeklyDays: [],
      pendingBeanOrders: [],
      upcomingHoliday: null,
    },
    itemsToOrder: [{ id: '1', name: 'เมล็ด', stock: 0, minStock: 1, orderQty: 1 }],
    branchWithdrawItems: [],
    inventoryCatalogItems: [],
    maintenanceTasks: [],
    isBranch2Day: false,
    branch2Remark: null,
    headcountToday: 4,
    ...overrides,
  };
}

function bridgeTask(description: string): SecretaryTask {
  return {
    id: 'task-bridge',
    task_type: 'custom',
    title: 'ตรวจ bean orders และสต็อกคลังที่เกี่ยวข้อง',
    description,
    priority: 'urgent',
    status: 'pending',
    module: 'bean_orders',
    due_at: null,
    scheduled_date: '2026-09-08',
    assignee_profile_id: null,
    source_kind: 'derived',
    source_ref: null,
    source_ref_hash: null,
    action_href: '/th/bean-orders',
    metadata: { insightBridge: true, insightRuleId: 'bean_orders_inventory_gap' },
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '2026-09-08T00:00:00.000Z',
    updated_at: '2026-09-08T00:00:00.000Z',
  };
}

describe('formatSecretaryBeanInventoryBridgeDescription', () => {
  test('reports both payment and shipment buckets from different orders', () => {
    expect(
      formatSecretaryBeanInventoryBridgeDescription(
        snapshot({
          operational: {
            ...snapshot().operational,
            pendingBeanOrders: [
              {
                customerName: 'ค้างชำระ',
                paymentStatus: 'unpaid',
                fulfillmentStatus: 'shipped',
                trackingStatus: 'delivered',
              },
              {
                customerName: 'ค้างจัดส่ง',
                paymentStatus: 'paid',
                fulfillmentStatus: 'pending',
              },
            ],
          },
          itemsToOrder: Array.from({ length: 31 }, (_, index) => ({
            id: String(index + 1),
            name: `item-${index + 1}`,
            stock: 0,
            minStock: 1,
            orderQty: 1,
          })),
        }),
      ),
    ).toBe('ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 1 รายการ · สั่งซื้อคลัง 31 รายการ');
  });

  test('returns null when bean backlog has no actionable buckets', () => {
    expect(
      formatSecretaryBeanInventoryBridgeDescription(
        snapshot({
          operational: {
            ...snapshot().operational,
            pendingBeanOrders: [],
          },
        }),
      ),
    ).toBeNull();
  });
});

describe('deriveInsightBridgeTasks bean inventory bridge', () => {
  test('uses workflow-aligned bean status summary in task description', () => {
    const tasks = deriveInsightBridgeTasks(
      snapshot({
        operational: {
          ...snapshot().operational,
          pendingBeanOrders: [
            {
              customerName: 'ค้างชำระ',
              paymentStatus: 'unpaid',
              fulfillmentStatus: 'shipped',
              trackingStatus: 'delivered',
            },
            {
              customerName: 'ค้างจัดส่ง',
              paymentStatus: 'paid',
              fulfillmentStatus: 'pending',
            },
          ],
        },
        itemsToOrder: Array.from({ length: 31 }, (_, index) => ({
          id: String(index + 1),
          name: `item-${index + 1}`,
          stock: 0,
          minStock: 1,
          orderQty: 1,
        })),
      }),
    );

    const bridge = tasks.find((task) => task.title.includes('bean orders'));
    expect(bridge?.description).toBe(
      'ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 1 รายการ · สั่งซื้อคลัง 31 รายการ',
    );
    expect(bridge?.sourceRef).toEqual(
      resolveSecretaryBeanInventoryBridgeSourceRef(
        snapshot({
          operational: {
            ...snapshot().operational,
            pendingBeanOrders: [
              {
                customerName: 'ค้างชำระ',
                paymentStatus: 'unpaid',
                fulfillmentStatus: 'shipped',
                trackingStatus: 'delivered',
              },
              {
                customerName: 'ค้างจัดส่ง',
                paymentStatus: 'paid',
                fulfillmentStatus: 'pending',
              },
            ],
          },
          itemsToOrder: Array.from({ length: 31 }, (_, index) => ({
            id: String(index + 1),
            name: `item-${index + 1}`,
            stock: 0,
            minStock: 1,
            orderQty: 1,
          })),
        }),
      ),
    );
  });
});

describe('resolveSecretaryTaskDetailText', () => {
  test('recomputes bean inventory bridge description from snapshot instead of stale DB text', () => {
    const liveSnapshot = snapshot({
      operational: {
        ...snapshot().operational,
        pendingBeanOrders: [
          {
            customerName: 'ค้างชำระ',
            paymentStatus: 'unpaid',
            fulfillmentStatus: 'shipped',
            trackingStatus: 'delivered',
          },
          {
            customerName: 'ค้างจัดส่ง',
            paymentStatus: 'paid',
            fulfillmentStatus: 'pending',
          },
        ],
      },
      itemsToOrder: Array.from({ length: 31 }, (_, index) => ({
        id: String(index + 1),
        name: `item-${index + 1}`,
        stock: 0,
        minStock: 1,
        orderQty: 1,
      })),
    });

    expect(isSecretaryBeanInventoryBridgeTask(bridgeTask('ค้างจัดส่ง 1 รายการ · สั่งซื้อคลัง 31 รายการ'))).toBe(
      true,
    );
    expect(
      resolveSecretaryTaskDetailText(
        bridgeTask('ค้างจัดส่ง 1 รายการ · สั่งซื้อคลัง 31 รายการ'),
        liveSnapshot,
      ),
    ).toBe('ค้างชำระเงิน 1 รายการ · ค้างจัดส่ง 1 รายการ · สั่งซื้อคลัง 31 รายการ');
  });
});
