import { describe, expect, test } from 'vitest';
import { deriveBeanOrderTasks } from '@/lib/secretary/rules/bean-orders-rules';
import type { SecretarySnapshot } from '@/lib/secretary/types';

function snapshot(
  pendingBeanOrders: SecretarySnapshot['operational']['pendingBeanOrders'],
): SecretarySnapshot {
  return {
    dateIso: '2026-08-29',
    locale: 'th',
    operational: {
      dateIso: '2026-08-29',
      dateDisplay: '29/08/2026',
      locale: 'th',
      headcount: 0,
      leaveCount: 0,
      offCount: 0,
      weeklyDays: [],
      pendingBeanOrders,
      upcomingHoliday: null,
    },
    itemsToOrder: [],
    branchWithdrawItems: [],
    inventoryCatalogItems: [],
    maintenanceTasks: [],
    isBranch2Day: false,
    headcountToday: 0,
  };
}

describe('deriveBeanOrderTasks', () => {
  test('creates one task for orders with any incomplete workflow status', () => {
    const tasks = deriveBeanOrderTasks(
      snapshot([
        {
          customerName: 'ลูกค้า A',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'pending',
          slipUploadedAt: null,
          trackingStatus: null,
        },
      ]),
    );

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.taskType).toBe('bean_orders_pending');
    expect(tasks[0]?.title).toBe('ออเดอร์เมล็ดกาแฟ (1)');
  });

  test('includes delivered-but-unpaid orders in the same task', () => {
    const tasks = deriveBeanOrderTasks(
      snapshot([
        {
          customerName: 'ลูกค้า A',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'shipped',
          slipUploadedAt: null,
          trackingStatus: 'delivered',
        },
      ]),
    );

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.taskType).toBe('bean_orders_pending');
  });

  test('includes slip-uploaded orders while delivery is still outstanding', () => {
    const tasks = deriveBeanOrderTasks(
      snapshot([
        {
          customerName: 'ลูกค้า B',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'pending',
          slipUploadedAt: '2026-08-29T10:00:00.000Z',
          trackingStatus: null,
        },
      ]),
    );

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.taskType).toBe('bean_orders_pending');
  });

  test('creates no tasks when payment and delivery are both complete', () => {
    const tasks = deriveBeanOrderTasks(
      snapshot([
        {
          customerName: 'ลูกค้า C',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'shipped',
          slipUploadedAt: '2026-08-29T10:00:00.000Z',
          trackingStatus: 'delivered',
        },
      ]),
    );

    expect(tasks).toHaveLength(0);
  });

  test('uses stable source ref hash across count changes', () => {
    const one = deriveBeanOrderTasks(
      snapshot([
        {
          customerName: 'A',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'shipped',
          slipUploadedAt: null,
          trackingStatus: 'delivered',
        },
      ]),
    );
    const two = deriveBeanOrderTasks(
      snapshot([
        {
          customerName: 'A',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'shipped',
          slipUploadedAt: null,
          trackingStatus: 'delivered',
        },
        {
          customerName: 'B',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'shipped',
          slipUploadedAt: null,
          trackingStatus: 'delivered',
        },
      ]),
    );

    expect(one[0]?.sourceRefHash).toBe(two[0]?.sourceRefHash);
  });
});
