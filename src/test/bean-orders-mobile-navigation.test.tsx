import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import BeanOrdersClient from '@/app/[locale]/bean-orders/BeanOrdersClient';

const ROOT = resolve(__dirname, '../..');

function readSrc(relativePath: string): string {
  return readFileSync(resolve(ROOT, 'src', relativePath), 'utf-8');
}

const sampleOrder: BeanOrderListRow = {
  id: 'order-lee',
  orderNo: 'BO-20260722-042',
  createdAt: '2026-07-22T14:00:00.000Z',
  customerName: 'คุณลี',
  recipientName: 'คุณลี',
  recipientPhone: '0899999999',
  recipientAddress: '123/4',
  recipientProvince: 'ระยอง',
  recipientPostalCode: '21110',
  paymentStatus: 'paid',
  fulfillmentStatus: 'pending',
  slipUploadedAt: '2026-07-22T14:00:00.000Z',
  deliveryType: null,
  carrierCode: null,
  trackingNumber: null,
  trackingStatus: null,
  cancelledAt: null,
  subtotalBaht: 5000,
  discountBaht: 0,
  shippingBaht: 300,
  totalBaht: 5300,
  notes: null,
  lines: [
    {
      itemName: 'Ethiopia',
      weightValue: 500,
      weightUnit: 'g',
      unitPricePerKg: 800,
      lineTotalBaht: 400,
    },
  ],
};

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('bean orders mobile navigation reliability', () => {
  test('BeanOrdersClient reflects updated initialOrders after soft navigation refresh', () => {
    const { rerender } = render(
      <BeanOrdersClient initialOrders={[]} locale="th" />,
    );
    expect(screen.getByText('ไม่พบออเดอร์')).toBeInTheDocument();

    rerender(<BeanOrdersClient initialOrders={[sampleOrder]} locale="th" />);
    expect(screen.getAllByText('คุณลี').length).toBeGreaterThan(0);
    expect(screen.queryByText('ไม่พบออเดอร์')).toBeNull();
  });

  test('bean orders list page imports client directly (no lazy null flash)', () => {
    const page = readSrc('app/[locale]/bean-orders/page.tsx');
    expect(page).toContain("import BeanOrdersClient from './BeanOrdersClient'");
    expect(page).not.toContain('createLazyFeatureClient');
  });

  test('notification deep links bypass view transitions for reliable mobile opens', () => {
    const pwa = readSrc('components/PwaRegister.tsx');
    expect(pwa).toContain('navigateWithoutViewTransition');
    expect(pwa).not.toMatch(/navigateWithViewTransition\(router\.push, safeUrl\)/);
  });

  test('page transition prefers light mobile path over view-transition wrapper', () => {
    const pageTransition = readSrc('components/ui/page-transition.tsx');
    expect(pageTransition).toMatch(
      /if \(viewTransitionEnabled && !useLightTransition\)/,
    );
  });

  test('bean order list item warms detail route on pointer down', () => {
    const listItem = readSrc('app/[locale]/bean-orders/_components/BeanOrderListItem.tsx');
    expect(listItem).toContain('onPointerDown');
    expect(listItem).toMatch(/onPointerDown[\s\S]*warmDetailRoute/);
  });
});
