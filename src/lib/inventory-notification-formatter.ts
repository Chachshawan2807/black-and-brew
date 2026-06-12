import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { FieldChange } from '@/lib/data-change-log';
import type { InventoryNotification, NotificationPriority } from '@/lib/notification-types';
import { logRowToNotificationInput } from '@/lib/notification-types';

const FIELD_LABELS: Record<string, { th: string; en: string }> = {
  stock: { th: 'สต็อก', en: 'Stock' },
  name: { th: 'ชื่อ', en: 'Name' },
  order_point: { th: 'จุดสั่งซื้อ', en: 'Order point' },
  order_qty: { th: 'จำนวนสั่ง', en: 'Order qty' },
  target_stock: { th: 'สต็อกเป้าหมาย', en: 'Target stock' },
  unit: { th: 'หน่วย', en: 'Unit' },
  source: { th: 'แหล่งที่มา', en: 'Source' },
  sort_order: { th: 'ลำดับ', en: 'Sort order' },
};

const ACTION_LABELS: Record<string, { th: string; en: string }> = {
  CREATE: { th: 'เพิ่มรายการ', en: 'Item added' },
  UPDATE: { th: 'แก้ไขรายการ', en: 'Item updated' },
  DELETE: { th: 'ลบรายการ', en: 'Item deleted' },
  BULK_UPDATE: { th: 'แก้ไขหลายรายการ', en: 'Bulk update' },
  BULK_DELETE: { th: 'ลบหลายรายการ', en: 'Bulk delete' },
};

function formatValue(value: unknown, isTh: boolean): string {
  if (value === null || value === undefined || value === '') {
    return isTh ? '(ว่าง)' : '(empty)';
  }
  return String(value);
}

export function formatFieldChange(change: FieldChange, isTh: boolean): string {
  const label = FIELD_LABELS[change.field]?.[isTh ? 'th' : 'en'] ?? change.field;
  const oldVal = formatValue(change.old_value, isTh);
  const newVal = formatValue(change.new_value, isTh);
  return `${label}: ${oldVal} → ${newVal}`;
}

export function summarizeFieldChanges(
  changes: FieldChange[],
  isTh: boolean,
  maxFields = 2
): string {
  if (!changes.length) {
    return isTh ? 'ไม่มีรายละเอียด' : 'No details';
  }
  const parts = changes.slice(0, maxFields).map((c) => formatFieldChange(c, isTh));
  if (changes.length > maxFields) {
    parts.push(isTh ? `+${changes.length - maxFields} ฟิลด์` : `+${changes.length - maxFields} fields`);
  }
  return parts.join(', ');
}

export function detectLowStockCrossing(
  changes: FieldChange[],
  metadata?: Record<string, unknown>
): boolean {
  const stockChange = changes.find((c) => c.field === 'stock');
  const orderPointChange = changes.find((c) => c.field === 'order_point');
  if (!stockChange) return false;

  const newStock = Number(stockChange.new_value);
  const oldStock = Number(stockChange.old_value);
  const orderPointFromMeta =
    metadata?.order_point != null ? Number(metadata.order_point) : undefined;
  const orderPoint = orderPointChange
    ? Number(orderPointChange.new_value)
    : orderPointFromMeta;

  if (Number.isNaN(newStock)) return false;

  if (orderPoint !== undefined && !Number.isNaN(orderPoint)) {
    return newStock <= orderPoint && (Number.isNaN(oldStock) || oldStock > orderPoint);
  }

  return false;
}

export function resolveNotificationPriority(
  action: string,
  fieldChanges: FieldChange[],
  metadata?: Record<string, unknown>
): NotificationPriority {
  if (action === 'DELETE' || action === 'BULK_DELETE') return 'high';
  if (detectLowStockCrossing(fieldChanges, metadata)) return 'high';
  return 'normal';
}

export function shouldShowToast(notification: InventoryNotification): boolean {
  return notification.priority === 'high';
}

export function formatInventoryNotification(
  row: DataChangeLogRow,
  locale: string,
  batchedCount = 1
): InventoryNotification {
  const isTh = locale === 'th';
  const base = logRowToNotificationInput(row);
  const actionLabel = ACTION_LABELS[row.action]?.[isTh ? 'th' : 'en'] ?? row.action;
  const entityName = row.entity_label || (isTh ? 'รายการคลังสินค้า' : 'Inventory item');
  const fieldSummary = summarizeFieldChanges(row.field_changes ?? [], isTh);
  const priority = resolveNotificationPriority(
    row.action,
    row.field_changes ?? [],
    row.metadata ?? {}
  );

  let title: string;
  let summary: string;

  if (batchedCount > 1) {
    title = isTh
      ? `คลังสินค้า: ${batchedCount} การเปลี่ยนแปลง`
      : `Inventory: ${batchedCount} changes`;
    summary = isTh
      ? `${row.actor_label} แก้ไข ${batchedCount} รายการ`
      : `${row.actor_label} changed ${batchedCount} items`;
  } else {
    title = `${actionLabel}: ${entityName}`;
    summary = fieldSummary;
  }

  return {
    ...base,
    title,
    summary,
    fieldSummary,
    priority,
    batchedCount,
  };
}

export function formatBatchedNotification(
  latest: DataChangeLogRow,
  count: number,
  locale: string
): InventoryNotification {
  return formatInventoryNotification(latest, locale, count);
}
