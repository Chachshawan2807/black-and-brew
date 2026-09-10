import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { PasteCustomerDialog } from '@/app/[locale]/bean-orders/_components/PasteCustomerDialog';
import { emptyThaiPostalAddress } from '@/lib/bean-orders/address';
import type { ParsedBeanOrderCustomer } from '@/lib/bean-orders/parse-share-text';

const sampleData: ParsedBeanOrderCustomer = {
  name: 'ทดสอบ ลูกค้า',
  phone: '0801234567',
  address: {
    ...emptyThaiPostalAddress(),
    addressLine: '99/5 ถนนทดสอบ',
    province: 'กรุงเทพมหานคร',
    postalCode: '10110',
  },
  parseSource: 'ai',
  missingFields: [],
};

describe('PasteCustomerDialog close guard', () => {
  test('closes immediately when no parsed data yet', () => {
    const onCancel = vi.fn();
    render(
      <PasteCustomerDialog
        open
        loading={false}
        error="ไม่พบข้อความในคลิปบอร์ด"
        data={null}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'ปิดโดยไม่นำไปใส่' })).toBeNull();
  });

  test('requires discard confirmation before closing when parsed data exists', () => {
    const onCancel = vi.fn();
    render(
      <PasteCustomerDialog
        open
        loading={false}
        error={null}
        data={sampleData}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText(/ข้อมูลที่แยกแล้วจะหายไป/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'กลับไปตรวจข้อมูล' }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText('ทดสอบ ลูกค้า')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    fireEvent.click(screen.getByRole('button', { name: 'ปิดโดยไม่นำไปใส่' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('requires discard confirmation when clicking backdrop with parsed data', () => {
    const onCancel = vi.fn();
    render(
      <PasteCustomerDialog
        open
        loading={false}
        error={null}
        data={sampleData}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const backdrop = document.body.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'ปิดโดยไม่นำไปใส่' })).toBeTruthy();
  });

  test('requires discard confirmation when clicking header close with parsed data', () => {
    const onCancel = vi.fn();
    render(
      <PasteCustomerDialog
        open
        loading={false}
        error={null}
        data={sampleData}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'ปิดโดยไม่นำไปใส่' })).toBeTruthy();
  });
});
