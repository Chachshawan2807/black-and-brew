import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { OrderListStatusGroup } from '@/app/[locale]/bean-orders/_components/OrderStatusBadge';

describe('OrderListStatusGroup', () => {
  test('shows payment badge in light green after slip upload', () => {
    render(<OrderListStatusGroup slipUploadedAt="2026-07-22T10:30:00.000Z" />);

    const badge = screen.getByText('ชำระแล้ว');
    expect(badge.className).toContain('bg-[#e8f5e9]');
    expect(badge.className).toContain('bb-pastel-surface');
  });

  test('shows delivery badge in light blue only when delivered', () => {
    render(<OrderListStatusGroup trackingStatus="delivered" />);

    const badge = screen.getByText('จัดส่งสำเร็จ');
    expect(badge.className).toContain('bg-[#e3f2fd]');
    expect(badge.className).toContain('bb-pastel-surface');
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
    expect(screen.queryByText('จัดส่งสำเร็จ')).toBeNull();
    expect(screen.queryByText('ส่งแล้ว (ไม่มีเลขพัสดุ)')).toBeNull();
  });
});
