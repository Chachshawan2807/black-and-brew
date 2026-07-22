import { describe, expect, test } from 'vitest';
import { formatBeanOrderShareText } from '@/lib/bean-orders/order-share-text';

const sampleOrder = {
  orderNo: 'BO-20260722-001',
  createdAt: '2026-07-22T10:30:00.000Z',
  customerName: 'คุณเอ',
  recipientName: 'คุณบี',
  recipientPhone: '0812345678',
  recipientAddress: '123/4 หมู่ 5',
  recipientProvince: 'ระยอง',
  recipientPostalCode: '21110',
  paymentStatus: 'paid' as const,
  fulfillmentStatus: 'shipped' as const,
  cancelledAt: null,
  subtotalBaht: 800,
  discountBaht: 50,
  shippingBaht: 60,
  totalBaht: 810,
  notes: 'บดหยาบ',
  deliveryType: 'parcel' as const,
  carrierCode: 'kerryexpress-th',
  trackingNumber: 'KEX123456789',
  latestTrackingLabel: 'จัดส่งสำเร็จ',
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
  test('includes core order, recipient, lines, totals, and shipping details', () => {
    const text = formatBeanOrderShareText(sampleOrder);

    expect(text).toContain('เลขที่: BO-20260722-001');
    expect(text).toContain('ลูกค้า: คุณเอ');
    expect(text).not.toContain('ผู้รับ:');
    expect(text).toContain('เบอร์: 0812345678');
    expect(text).toContain('Ethiopia Yirgacheffe');
    expect(text).toContain('ยอดรวม: 810 บาท');
    expect(text).toContain('ผู้ให้บริการ: Kerry Express');
    expect(text).toContain('เลขพัสดุ: KEX123456789');
    expect(text).toContain('สถานะจัดส่งล่าสุด: จัดส่งสำเร็จ');
    expect(text).toContain('หมายเหตุ: บดหยาบ');
    expect(text).not.toContain('<');
  });

  test('shows pending shipping state when order is not shipped yet', () => {
    const text = formatBeanOrderShareText({
      ...sampleOrder,
      fulfillmentStatus: 'pending',
      deliveryType: null,
      carrierCode: null,
      trackingNumber: null,
      latestTrackingLabel: null,
    });

    expect(text).toContain('สถานะ: ชำระแล้ว · รอจัดส่ง');
    expect(text).toContain('การจัดส่ง: ยังไม่บันทึกจัดส่ง');
  });
});
