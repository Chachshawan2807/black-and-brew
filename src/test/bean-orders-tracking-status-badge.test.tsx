import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { TrackingStatusBadge } from '@/app/[locale]/bean-orders/_components/OrderStatusBadge';

describe('TrackingStatusBadge', () => {
  test('uses light green for delivered tracking status', () => {
    render(<TrackingStatusBadge label="จัดส่งสำเร็จ" />);

    const badge = screen.getByText('จัดส่งสำเร็จ');
    expect(badge.className).toContain('bg-[#e8f5e9]');
    expect(badge.className).toContain('bb-pastel-surface');
  });
});
