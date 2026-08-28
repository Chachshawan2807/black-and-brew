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
  orderNo: 'BO-20260722-42',
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => '/th/bean-orders',
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

  test('Web Push click does not navigate away from the current page', () => {
    const pwa = readSrc('components/PwaRegister.tsx');
    expect(pwa).not.toContain('navigateWithoutViewTransition');
    expect(pwa).not.toContain('router.push');
  });

  test('page transition defers view transitions until viewport is known', () => {
    const pageTransition = readSrc('components/ui/page-transition.tsx');
    expect(pageTransition).toMatch(
      /if \(viewTransitionEnabled && isMaxMd === false && !reduced\)/,
    );
    expect(pageTransition).toContain('const isViewportUnknown = isMaxMd === null');
  });

  test('mobile page transition avoids pathname remount and opacity-0 enter flash', () => {
    const pageTransition = readSrc('components/ui/page-transition.tsx');
    const mobileBranch = pageTransition.match(
      /if \(useLightTransition \|\| isViewportUnknown\)[\s\S]*?return <div className="min-h-0">\{children\}<\/div>/,
    );
    expect(mobileBranch?.[0]).toBeTruthy();
    expect(pageTransition).not.toMatch(
      /useLightTransition[\s\S]*key=\{pathname\}[\s\S]*animate-page-enter/,
    );
  });

  test('bean order list warms RSC payload via router prefetch on intent', () => {
    const listItem = readSrc('app/[locale]/bean-orders/_components/BeanOrderListItem.tsx');
    expect(listItem).toContain('warmRouteNavigation');
    expect(listItem).toContain('router.prefetch');
    const listClient = readSrc('app/[locale]/bean-orders/BeanOrdersClient.tsx');
    expect(listClient).toContain('warmRouteNavigation');
    expect(listClient).toContain('router.prefetch');
  });

  test('instant nav bridge prefetches route payload on pointer down', () => {
    const nav = readSrc('components/shell/ViewTransitionNavigation.tsx');
    expect(nav).toContain("addEventListener('pointerdown', onPointerDown, true)");
    expect(nav).toContain('warmRouteNavigation');
    expect(nav).toContain('router.prefetch');
  });

  test('instant nav bridge navigates on touch pointerup to avoid lost mobile clicks', () => {
    const nav = readSrc('components/shell/ViewTransitionNavigation.tsx');
    expect(nav).toContain("addEventListener('pointerup', onPointerUp, true)");
    expect(nav).toMatch(/pointerType !== 'touch'[\s\S]*pendingInstantTouch/);
    expect(nav).toContain('INSTANT_NAV_TOUCH_MOVE_THRESHOLD_SQ');
    expect(nav).toContain('suppressInstantNavClick');
  });

  test('bean order list item warms detail route on primary pointer down', () => {
    const listItem = readSrc('app/[locale]/bean-orders/_components/BeanOrderListItem.tsx');
    expect(listItem).toContain('onPointerDown');
    expect(listItem).toMatch(/event\.button === 0[\s\S]*warmDetailRoute/);
  });
});
