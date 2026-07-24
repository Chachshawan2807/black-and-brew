import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import { BeanOrderListItem } from '@/app/[locale]/bean-orders/_components/BeanOrderListItem';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const sampleOrder: BeanOrderListRow = {
  id: 'order-1',
  orderNo: 'BO-20260722-001',
  createdAt: '2026-07-22T10:30:00.000Z',
  customerName: 'คุณเอ',
  recipientName: 'คุณบี',
  recipientPhone: '0812345678',
  recipientAddress: '123/4 หมู่ 5',
  recipientProvince: 'ระยอง',
  recipientPostalCode: '21110',
  paymentStatus: 'paid',
  fulfillmentStatus: 'pending',
  slipUploadedAt: '2026-07-22T10:30:00.000Z',
  deliveryType: null,
  carrierCode: null,
  trackingNumber: null,
  trackingStatus: null,
  cancelledAt: null,
  subtotalBaht: 800,
  discountBaht: 0,
  shippingBaht: 60,
  totalBaht: 860,
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

describe('BeanOrderListItem', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  test('copy button is not nested inside the order detail link', () => {
    render(<BeanOrderListItem order={sampleOrder} locale="th" />);

    const copyButton = screen.getByRole('button', { name: 'คัดลอกรายละเอียดออเดอร์' });
    const detailLinks = screen.getAllByRole('link', { name: /คุณเอ/i });

    expect(copyButton.closest('a')).toBeNull();
    expect(detailLinks.every((link) => !link.contains(copyButton))).toBe(true);
  });

  test('clicking copy writes share text without relying on link navigation', async () => {
    render(<BeanOrderListItem order={sampleOrder} locale="th" />);

    fireEvent.click(screen.getByRole('button', { name: 'คัดลอกรายละเอียดออเดอร์' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(await screen.findByText('คัดลอกแล้ว')).toBeInTheDocument();
  });

  test('shows destination only in destination area and delivery badge in status column', () => {
    const orderWithTracking: BeanOrderListRow = {
      ...sampleOrder,
      fulfillmentStatus: 'shipped',
      deliveryType: 'parcel',
      carrierCode: 'kerryexpress-th',
      trackingStatus: 'delivered',
    };

    render(<BeanOrderListItem order={orderWithTracking} locale="th" />);

    expect(screen.getAllByText('จ.ระยอง').length).toBeGreaterThan(0);
    expect(screen.queryByText(/จ\.ระยอง \/ จัดส่งสำเร็จ/)).toBeNull();
    expect(screen.getAllByText('จัดส่งสำเร็จ').length).toBeGreaterThan(0);
    expect(screen.queryByText('ส่งแล้ว (ไม่มีเลขพัสดุ)')).toBeNull();
  });
});
