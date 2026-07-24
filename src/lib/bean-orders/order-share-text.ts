import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import type { WeightUnit } from '@/lib/bean-orders/types';

const SHARE_LINE_SEPARATOR = '  ';

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
  notes: string | null;
  lines: BeanOrderShareLine[];
};

function formatBaht(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatShareDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const datePart = parsed.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  const timePart = parsed.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} - ${timePart}`;
}

function formatWeight(value: number, unit: WeightUnit): string {
  return `${value}${unit === 'g' ? ' ก.' : ' กก.'}`;
}

function formatRecipientAddress(order: BeanOrderShareInput): string {
  const base = order.recipientAddress.trim();
  const tail = [order.recipientProvince, order.recipientPostalCode].filter(Boolean).join(' ');
  if (!tail) return base;
  if (base.includes(tail)) return base;
  return [base, tail].filter(Boolean).join(' ');
}

function hasShareTextValue(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 && trimmed !== '—' && trimmed !== '-';
}

function formatLineItem(line: BeanOrderShareLine, index: number): string {
  return [
    `${index + 1}) ${line.itemName}`,
    formatWeight(line.weightValue, line.weightUnit),
    `${formatBaht(line.unitPricePerKg)} บาท/กก.`,
    `รวม ${formatBaht(line.lineTotalBaht)} บาท`,
  ].join(SHARE_LINE_SEPARATOR);
}

/** ข้อความธรรมดาสำหรับส่งต่อรายละเอียดออเดอร์ให้พนักงาน */
export function formatBeanOrderShareText(order: BeanOrderShareInput): string {
  const lineItems =
    order.lines.length > 0
      ? order.lines.map((line, index) => formatLineItem(line, index))
      : ['—'];

  const address = formatRecipientAddress(order);
  const lines = [
    'ออเดอร์เมล็ดกาแฟ',
    formatShareDate(order.createdAt),
    '',
    `ลูกค้า: ${getBeanOrderCustomerDisplayName(order)}`,
  ];

  if (hasShareTextValue(order.recipientPhone)) {
    lines.push(`เบอร์: ${order.recipientPhone!.trim()}`);
  }
  if (hasShareTextValue(address)) {
    lines.push(`ที่อยู่: ${address}`);
  }

  lines.push('', 'รายการสินค้า:', ...lineItems);

  if (hasShareTextValue(order.notes)) {
    lines.push('', `หมายเหตุ: ${order.notes!.trim()}`);
  }

  return lines.join('\n');
}
