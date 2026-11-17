import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import BeanOrdersClient from '@/app/[locale]/bean-orders/BeanOrdersClient';
import {
  BEAN_ORDER_CREATED_ROWS_KEY,
  buildCreatedBeanOrderListRow,
  mergeBeanOrderCreatedPatches,
  stashBeanOrderCreatedPatch,
} from '@/lib/bean-orders/created-list-snapshot';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => '/th/bean-orders',
}));

const createdRow = buildCreatedBeanOrderListRow({
  id: 'order-new',
  orderNo: 'BO-20261117-9',
  createdAt: '2026-11-17T10:00:00.000Z',
  customerName: 'คุณใหม่',
  recipientName: 'คุณใหม่',
  recipientPhone: '0811111111',
  recipientAddress: '99/1',
  recipientProvince: 'เชียงใหม่',
  recipientPostalCode: '50000',
  discountBaht: 0,
  shippingBaht: 50,
  notes: null,
  lines: [
    {
      itemName: 'Ethiopia',
      weightValue: 500,
      weightUnit: 'g',
      unitPricePerKg: 800,
    },
  ],
  paymentStatus: 'unpaid',
  slipUploadedAt: null,
  fulfillmentStatus: 'pending',
  carrierCode: null,
  trackingNumber: null,
});

describe('bean order created list snapshot', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('buildCreatedBeanOrderListRow prices lines from weight and unit price', () => {
    expect(createdRow.lines[0]?.lineTotalBaht).toBe(400);
    expect(createdRow.totalBaht).toBe(450);
    expect(createdRow.paymentStatus).toBe('unpaid');
  });

  test('merge keeps a just-created order ahead of a stale cached list', () => {
    const stale: BeanOrderListRow[] = [];
    stashBeanOrderCreatedPatch(createdRow);

    expect(mergeBeanOrderCreatedPatches(stale).map((order) => order.id)).toEqual(['order-new']);
    expect(sessionStorage.getItem(BEAN_ORDER_CREATED_ROWS_KEY)).toContain('order-new');
  });

  test('merge drops the local patch once the server list includes the order', () => {
    stashBeanOrderCreatedPatch(createdRow);

    const merged = mergeBeanOrderCreatedPatches([createdRow]);

    expect(merged).toEqual([createdRow]);
    expect(sessionStorage.getItem(BEAN_ORDER_CREATED_ROWS_KEY)).toBeNull();
  });

  test('list shows the just-created order when the route payload is still empty', () => {
    stashBeanOrderCreatedPatch(createdRow);

    render(<BeanOrdersClient initialOrders={[]} locale="th" />);

    expect(screen.getAllByText('BO-20261117-9').length).toBeGreaterThan(0);
    expect(screen.queryByText('ยังไม่มีออเดอร์')).toBeNull();
  });
});
