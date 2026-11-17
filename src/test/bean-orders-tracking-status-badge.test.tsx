import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { OrderListStatusGroup } from '@/app/[locale]/bean-orders/_components/OrderStatusBadge';

describe('OrderListStatusGroup', () => {
  test('shows payment badge when payment is confirmed without slip', () => {
    render(<OrderListStatusGroup paymentStatus="paid" />);

    const badge = screen.getByText('ชำระแล้ว');
    expect(badge.className).toContain('bg-[#e8f5e9]');
    expect(badge.className).toContain('bb-pastel-surface');
  });

  test('shows payment badge in light green after slip upload', () => {
    render(<OrderListStatusGroup slipUploadedAt="2026-07-22T10:30:00.000Z" />);

    const badge = screen.getByText('ชำระแล้ว');
    expect(badge.className).toContain('bg-[#e8f5e9]');
    expect(badge.className).toContain('bb-pastel-surface');
  });

  test('shows จัดส่งแล้ว badge when workflow closed', () => {
    render(
      <OrderListStatusGroup
        fulfillmentStatus="shipped"
        trackingNumber={null}
        trackingStatus={null}
      />,
    );
    const badge = screen.getByText('จัดส่งแล้ว');
    expect(badge.className).toContain('bg-[#e3f2fd]');
  });

  test('hides badges for in-progress shipment without delivery confirmation', () => {
    render(
      <OrderListStatusGroup
        slipUploadedAt={null}
        trackingStatus={null}
        cancelledAt={null}
      />,
    );

    expect(screen.queryByText('ชำระแล้ว')).toBeNull();
    expect(screen.queryByText('จัดส่งแล้ว')).toBeNull();
    expect(screen.queryByText('ส่งแล้ว (ไม่มีเลขพัสดุ)')).toBeNull();
  });
});
