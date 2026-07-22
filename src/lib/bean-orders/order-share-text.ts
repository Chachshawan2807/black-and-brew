import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import { getCarrierLabel } from '@/lib/bean-orders/carriers';
import { getDeliveryTypeLabel } from '@/lib/bean-orders/delivery';
import { getOrderStatusLabel } from '@/lib/bean-orders/order-status';
import type { DeliveryType, WeightUnit } from '@/lib/bean-orders/types';

export type BeanOrderShareLine = {
  itemName: string;
  weightValue: number;
  weightUnit: WeightUnit;
  unitPricePerKg: number;
  lineTotalBaht: number;
};

export type BeanOrderShareInput = {
  orderNo: string;
  createdAt: string;
  customerName: string | null;
  recipientName: string;
  recipientPhone: string | null;
  recipientAddress: string;
  recipientProvince: string | null;
  recipientPostalCode: string | null;
  paymentStatus: 'unpaid' | 'paid';
  fulfillmentStatus: 'pending' | 'shipped';
  cancelledAt: string | null;
  subtotalBaht: number;
  discountBaht: number;
  shippingBaht: number;
  totalBaht: number;
  notes: string | null;
  deliveryType: DeliveryType | null;
  carrierCode: string | null;
  trackingNumber: string | null;
  latestTrackingLabel: string | null;
  lines: BeanOrderShareLine[];
};

function formatBaht(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatShareDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatWeight(value: number, unit: WeightUnit): string {
  return `${value}${unit === 'g' ? ' ก.' : ' กก.'}`;
}

function formatRecipientAddress(order: BeanOrderShareInput): string {
  const base = order.recipientAddress.trim();
  const tail = [order.recipientProvince, order.recipientPostalCode].filter(Boolean).join(' ');
  if (!tail) return base || '—';
  if (base.includes(tail)) return base;
  return [base, tail].filter(Boolean).join(' ');
}

function formatLineItem(line: BeanOrderShareLine, index: number): string {
  return `${index + 1}) ${line.itemName} · ${formatWeight(line.weightValue, line.weightUnit)} · ${formatBaht(line.unitPricePerKg)} บาท/กก. · รวม ${formatBaht(line.lineTotalBaht)} บาท`;
}

function formatShippingSection(order: BeanOrderShareInput): string[] {
  if (order.fulfillmentStatus !== 'shipped' || !order.deliveryType) {
    return ['การจัดส่ง: ยังไม่บันทึกจัดส่ง'];
  }

  const lines = [`ประเภทจัดส่ง: ${getDeliveryTypeLabel(order.deliveryType)}`];

  if (order.deliveryType === 'parcel') {
    lines.push(`ผู้ให้บริการ: ${getCarrierLabel(order.carrierCode)}`);
    lines.push(`เลขพัสดุ: ${order.trackingNumber?.trim() || '—'}`);
  } else if (order.carrierCode) {
    lines.push(`ผู้ให้บริการ: ${getCarrierLabel(order.carrierCode)}`);
  }

  if (order.latestTrackingLabel) {
    lines.push(`สถานะจัดส่งล่าสุด: ${order.latestTrackingLabel}`);
  }

  return lines;
}

/** ข้อความธรรมดาสำหรับส่งต่อรายละเอียดออเดอร์ให้พนักงาน */
export function formatBeanOrderShareText(order: BeanOrderShareInput): string {
  const status = getOrderStatusLabel(order.paymentStatus, order.fulfillmentStatus, order.cancelledAt);
  const lineItems =
    order.lines.length > 0
      ? order.lines.map((line, index) => formatLineItem(line, index))
      : ['—'];

  return [
    'ออเดอร์เมล็ดกาแฟ',
    `เลขที่: ${order.orderNo}`,
    `วันที่สร้าง: ${formatShareDate(order.createdAt)}`,
    `สถานะ: ${status}`,
    '',
    `ลูกค้า: ${getBeanOrderCustomerDisplayName(order)}`,
    `เบอร์: ${order.recipientPhone?.trim() || '—'}`,
    `ที่อยู่จัดส่ง: ${formatRecipientAddress(order)}`,
    '',
    'รายการสินค้า:',
    ...lineItems,
    '',
    `รวมสินค้า: ${formatBaht(order.subtotalBaht)} บาท`,
    `ส่วนลด: ${formatBaht(order.discountBaht)} บาท`,
    `ค่าจัดส่ง: ${formatBaht(order.shippingBaht)} บาท`,
    `ยอดรวม: ${formatBaht(order.totalBaht)} บาท`,
    '',
    ...formatShippingSection(order),
    '',
    `หมายเหตุ: ${order.notes?.trim() || '—'}`,
  ].join('\n');
}
