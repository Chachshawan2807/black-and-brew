import type { StatusHistoryEntry } from '@/lib/bean-orders/types';

/** Display-only labels; stored values stay English. */
export const BEAN_ORDER_VALUE_LABELS: Record<string, { th: string; en: string }> = {
  unpaid: { th: 'ยังไม่ชำระ', en: 'Unpaid' },
  paid: { th: 'ชำระแล้ว', en: 'Paid' },
  pending: { th: 'รอจัดส่ง', en: 'Pending' },
  shipped: { th: 'ส่งแล้ว', en: 'Shipped' },
  delivered: { th: 'จัดส่งสำเร็จ', en: 'Delivered' },
  in_transit: { th: 'กำลังจัดส่ง', en: 'In transit' },
  updated: { th: 'อัปเดตแล้ว', en: 'Updated' },
};

const STATUS_ACTION_LABELS: Record<string, { th: string; en: string }> = {
  created: { th: 'สร้างออเดอร์', en: 'Order created' },
  updated: { th: 'แก้ไขออเดอร์', en: 'Order updated' },
  payment_confirmed: { th: 'ยืนยันชำระเงิน', en: 'Payment confirmed' },
  payment_reverted: { th: 'ยกเลิกการชำระ', en: 'Payment reverted' },
  shipped: { th: 'บันทึกการจัดส่ง', en: 'Shipment recorded' },
  shipment_updated: { th: 'อัปเดตการจัดส่ง', en: 'Shipment updated' },
  delivery_confirmed: { th: 'จัดส่งสำเร็จ', en: 'Delivery confirmed' },
};

export function formatBeanOrderEnumValue(value: unknown, isTh: boolean): string | null {
  if (value === null || value === undefined) return null;
  const key = String(value).trim();
  if (!key) return null;
  const label = BEAN_ORDER_VALUE_LABELS[key];
  return label ? label[isTh ? 'th' : 'en'] : null;
}

export function formatBeanOrderStatusAction(action: string, isTh: boolean): string {
  const label = STATUS_ACTION_LABELS[action];
  return label ? label[isTh ? 'th' : 'en'] : action;
}

export function formatBeanOrderAuditHeadline(
  action: string,
  entityType: string,
  entityLabel: string | null | undefined,
  isTh: boolean,
): string {
  const label = entityLabel?.trim();
  const orderRef = label ? ` ${label}` : '';

  if (entityType === 'bean_customer') {
    return isTh
      ? label ? `เพิ่มลูกค้า: ${label}` : 'เพิ่มลูกค้า'
      : label ? `Customer added: ${label}` : 'Customer added';
  }

  if (entityType === 'bean_order_payment') {
    return isTh
      ? label ? `อัปโหลดสลิป: ${label}` : 'อัปโหลดสลิปชำระเงิน'
      : label ? `Slip uploaded: ${label}` : 'Payment slip uploaded';
  }

  switch (action) {
    case 'CREATE':
      return isTh ? `สร้างออเดอร์${orderRef}` : `Order created${orderRef}`;
    case 'DELETE':
      return isTh ? `ลบออเดอร์${orderRef}` : `Order deleted${orderRef}`;
    case 'UPDATE':
      return isTh ? `แก้ไขออเดอร์${orderRef}` : `Order updated${orderRef}`;
    default:
      return isTh
        ? label ? `ออเดอร์เมล็ด${orderRef}` : 'ออเดอร์เมล็ดกาแฟ'
        : label ? `Bean order${orderRef}` : 'Bean order';
  }
}

export function formatBeanOrderMetadataDetail(
  metadata: Record<string, unknown> | null | undefined,
  isTh: boolean,
): string | null {
  const action = metadata?.action;
  if (action === 'slip_uploaded') {
    return isTh ? 'อัปโหลดสลิปชำระเงิน' : 'Payment slip uploaded';
  }
  return null;
}

export function formatHistoryDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(iso));
}

export function formatBeanOrderStatusHistoryLine(
  entry: StatusHistoryEntry,
  locale: string,
): string {
  const isTh = locale === 'th';
  const when = formatHistoryDateTime(entry.at, locale);
  const action = formatBeanOrderStatusAction(entry.action, isTh);
  const by = entry.by?.trim();
  const parts = [when, action];
  if (by) parts.push(by);
  return parts.join(' · ');
}
