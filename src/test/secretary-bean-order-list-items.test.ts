import { describe, expect, test } from 'vitest';
import {
  buildBeanOrderListItems,
  filterBeanOrdersForSecretaryTask,
} from '@/lib/secretary/build-bean-order-list-items';
import { resolveSecretaryTaskOverlayKind } from '@/lib/secretary/resolve-task-overlay';
import type { SecretarySnapshot } from '@/lib/secretary/types';

const snapshot = {
  operational: {
    pendingBeanOrders: [
      {
        customerName: 'คุณ A',
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'pending',
      },
      {
        customerName: 'คุณ B',
        paymentStatus: 'paid',
        fulfillmentStatus: 'pending',
      },
      {
        customerName: 'คุณ C',
        paymentStatus: 'paid',
        fulfillmentStatus: 'shipped',
        trackingStatus: 'in_transit',
      },
    ],
  },
} as Pick<SecretarySnapshot, 'operational'>;

describe('bean order secretary list overlay', () => {
  test('resolves bean order tasks to list overlay kind', () => {
    expect(
      resolveSecretaryTaskOverlayKind({
        task_type: 'bean_orders_pending',
      } as never),
    ).toBe('bean_orders_list');
  });

  test('builds read-only rows from snapshot pending orders', () => {
    const items = buildBeanOrderListItems(
      { id: 'task-1', task_type: 'bean_orders_pending' },
      snapshot,
    );

    expect(items).toHaveLength(3);
    expect(items[0]?.primary).toBe('คุณ A');
    expect(items[0]?.secondary).toContain('ค้างชำระ');
  });

  test('legacy payment task filters unpaid orders only', () => {
    const filtered = filterBeanOrdersForSecretaryTask(
      { task_type: 'bean_payment_pending' },
      snapshot.operational.pendingBeanOrders,
    );

    expect(filtered.map((order) => order.customerName)).toEqual(['คุณ A']);
  });
});
