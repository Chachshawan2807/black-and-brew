import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { BeanOrderPaymentFields } from '@/app/[locale]/bean-orders/_components/BeanOrderPaymentFields';

const baseProps = {
  slipUrl: null as string | null,
  uploadedAt: null as string | null,
  confirmedAt: null as string | null,
  confirmedBy: null as string | null,
  paymentStatus: 'unpaid' as const,
  pendingSlipFile: null as File | null,
  pendingSlipPreview: null as string | null,
  onSelectSlipFile: vi.fn(),
  confirmPaymentOnSave: false,
  onConfirmPaymentOnSaveChange: vi.fn(),
  onRequestRevertPayment: vi.fn(),
};

describe('BeanOrderPaymentFields confirm button', () => {
  test('enables confirm payment when no slip is uploaded', () => {
    render(<BeanOrderPaymentFields {...baseProps} />);

    const button = screen.getByRole('button', { name: 'ยืนยันชำระแล้ว' });
    expect(button).not.toBeDisabled();
    expect(button.className).toContain('bg-[#d4edda]');
  });

  test('disables confirm payment and turns gray after slip upload', () => {
    render(
      <BeanOrderPaymentFields
        {...baseProps}
        orderId="order-1"
        uploadedAt="2026-07-31T10:00:00.000Z"
        slipUrl="https://example.com/slip.jpg"
      />,
    );

    const button = screen.getByRole('button', { name: 'ยืนยันชำระแล้ว' });
    expect(button).toBeDisabled();
    expect(button.className).toMatch(/bg-muted|bg-gray|text-muted/);
    expect(button.className).not.toContain('bg-[#d4edda]');
  });

  test('disables confirm payment when a pending slip file is selected', () => {
    const file = new File(['slip'], 'slip.jpg', { type: 'image/jpeg' });
    render(
      <BeanOrderPaymentFields
        {...baseProps}
        pendingSlipFile={file}
        pendingSlipPreview="blob:preview"
      />,
    );

    const button = screen.getByRole('button', { name: 'ยืนยันชำระแล้ว' });
    expect(button).toBeDisabled();
  });
});
