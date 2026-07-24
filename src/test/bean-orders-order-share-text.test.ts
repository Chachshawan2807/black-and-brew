import { describe, expect, test } from 'vitest';
import { formatBeanOrderShareText, formatShareDate } from '@/lib/bean-orders/order-share-text';

const sampleOrder = {
  orderNo: 'BO-20260722-001',
  createdAt: '2026-07-22T10:30:00.000Z',
  customerName: 'คุณเอ',
  recipientName: 'คุณบี',
  recipientPhone: '0812345678',
  recipientAddress: '123/4 หมู่ 5',
  recipientProvince: 'ระยอง',
  recipientPostalCode: '21110',
  notes: 'บดหยาบ',
  lines: [
    {
      itemName: 'Ethiopia Yirgacheffe',
      weightValue: 500,
      weightUnit: 'g' as const,
      unitPricePerKg: 800,
      lineTotalBaht: 400,
    },
    {
      itemName: 'Colombia',
      weightValue: 1,
      weightUnit: 'kg' as const,
      unitPricePerKg: 400,
      lineTotalBaht: 400,
    },
  ],
};

describe('formatBeanOrderShareText', () => {
  test('copies compact order text with short date and optional fields only when present', () => {
    const text = formatBeanOrderShareText(sampleOrder);

    expect(text).toBe(
      [
        'ออเดอร์เมล็ดกาแฟ',
        formatShareDate(sampleOrder.createdAt),
        '',
        'ลูกค้า: คุณเอ',
        'เบอร์: 0812345678',
        'ที่อยู่: 123/4 หมู่ 5 ระยอง 21110',
        '',
        'รายการสินค้า:',
        '1) Ethiopia Yirgacheffe  500 ก.  800 บาท/กก.  รวม 400 บาท',
        '2) Colombia  1 กก.  400 บาท/กก.  รวม 400 บาท',
        '',
        'หมายเหตุ: บดหยาบ',
      ].join('\n'),
    );
    expect(text).not.toContain('วันที่:');
    expect(text).not.toContain('ที่อยู่จัดส่ง:');
  });

  test('omits empty phone, address, and notes from copy text', () => {
    const text = formatBeanOrderShareText({
      ...sampleOrder,
      customerName: 'คุณลี',
      recipientPhone: null,
      recipientAddress: '',
      recipientProvince: null,
      recipientPostalCode: null,
      notes: null,
      lines: [
        {
          itemName: 'เมล็ดกาแฟคั่วเข้ม',
          weightValue: 5,
          weightUnit: 'kg' as const,
          unitPricePerKg: 530,
          lineTotalBaht: 2650,
        },
      ],
    });

    expect(text).toBe(
      [
        'ออเดอร์เมล็ดกาแฟ',
        formatShareDate(sampleOrder.createdAt),
        '',
        'ลูกค้า: คุณลี',
        '',
        'รายการสินค้า:',
        '1) เมล็ดกาแฟคั่วเข้ม  5 กก.  530 บาท/กก.  รวม 2,650 บาท',
      ].join('\n'),
    );
    expect(text).not.toContain('เบอร์:');
    expect(text).not.toContain('ที่อยู่:');
    expect(text).not.toContain('หมายเหตุ:');
  });

  test('omits status, totals, delivery type, and shipping details from copy text', () => {
    const text = formatBeanOrderShareText(sampleOrder);

    expect(text).not.toContain('สถานะ:');
    expect(text).not.toContain('รวมสินค้า:');
    expect(text).not.toContain('ส่วนลด:');
    expect(text).not.toContain('ค่าจัดส่ง:');
    expect(text).not.toContain('ยอดรวม:');
    expect(text).not.toContain(' / ');
  });
});
