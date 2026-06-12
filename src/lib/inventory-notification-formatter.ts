import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';

import type { FieldChange } from '@/lib/data-change-log';

import type { InventoryNotification, NotificationPriority } from '@/lib/notification-types';

import { logRowToNotificationInput } from '@/lib/notification-types';

import { isUuidString } from '@/lib/pwa-notification-bridge';



const FIELD_LABELS: Record<string, { th: string; en: string }> = {

  stock: { th: 'คงเหลือ', en: 'Stock' },

  name: { th: 'ชื่อ', en: 'Name' },

  order_point: { th: 'จุดสั่งซื้อ', en: 'Order point' },

  order_qty: { th: 'จำนวนสั่ง', en: 'Order qty' },

  target_stock: { th: 'จำนวนที่ต้องมี', en: 'Target stock' },

  unit: { th: 'หน่วย', en: 'Unit' },

  source: { th: 'ช่องทางสั่งซื้อ', en: 'Source' },

  sort_order: { th: 'ลำดับ', en: 'Sort order' },

};



const ACTION_LABELS: Record<string, { th: string; en: string }> = {

  CREATE: { th: 'เพิ่มรายการ', en: 'Item added' },

  UPDATE: { th: 'แก้ไขรายการ', en: 'Item updated' },

  DELETE: { th: 'ลบรายการ', en: 'Item deleted' },

  BULK_UPDATE: { th: 'แก้ไขหลายรายการ', en: 'Bulk update' },

  BULK_DELETE: { th: 'ลบหลายรายการ', en: 'Bulk delete' },

};



/** Never show these in user-facing notification text */

const HIDDEN_NOTIFICATION_FIELDS = new Set([

  'id',

  'created_at',

  'updated_at',

  'inventory_item_id',

  'product_id',

  'entity_id',

  'clientSessionId',

  'client_session_id',

]);



const DISPLAY_PRIORITY = [

  'stock',

  'name',

  'order_point',

  'target_stock',

  'order_qty',

  'unit',

  'source',

  'sort_order',

];



function formatDisplayValue(value: unknown, isTh: boolean): string | null {

  if (value === null || value === undefined || value === '') {

    return isTh ? '0' : '0';

  }

  if (typeof value === 'number' && !Number.isNaN(value)) {

    return String(value);

  }

  const text = String(value).trim();

  if (!text) return isTh ? '0' : '0';

  if (isUuidString(text)) return null;

  if (text.length > 80) return `${text.slice(0, 77)}…`;

  return text;

}



export function filterChangesForDisplay(changes: FieldChange[]): FieldChange[] {

  return changes.filter((change) => {

    if (HIDDEN_NOTIFICATION_FIELDS.has(change.field)) return false;

    if (isUuidString(change.old_value) || isUuidString(change.new_value)) {

      if (change.field !== 'name') return false;

    }

    return true;

  });

}



export function formatFieldChange(change: FieldChange, isTh: boolean): string {

  const label = FIELD_LABELS[change.field]?.[isTh ? 'th' : 'en'] ?? change.field;

  const oldVal = formatDisplayValue(change.old_value, isTh);

  const newVal = formatDisplayValue(change.new_value, isTh);

  if (oldVal === null && newVal === null) return '';

  if (oldVal === null && newVal !== null) return `${label}: ${newVal}`;

  if (oldVal !== null && newVal === null) return `${label}: ${oldVal}`;

  return `${label}: ${oldVal} → ${newVal}`;

}



export function summarizeFieldChanges(

  changes: FieldChange[],

  isTh: boolean,

  maxFields = 2

): string {

  const filtered = filterChangesForDisplay(changes)

    .filter((c) => c.field !== 'name')

    .sort(

      (a, b) =>

        DISPLAY_PRIORITY.indexOf(a.field) - DISPLAY_PRIORITY.indexOf(b.field)

    );



  const parts = filtered

    .map((c) => formatFieldChange(c, isTh))

    .filter((line) => line.length > 0);



  if (!parts.length) {

    return isTh ? 'มีการอัปเดตข้อมูล' : 'Data updated';

  }



  const shown = parts.slice(0, maxFields);

  if (parts.length > maxFields) {

    shown.push(

      isTh ? `และอีก ${parts.length - maxFields} รายการ` : `and ${parts.length - maxFields} more`

    );

  }

  return shown.join(' · ');

}



function buildCreateSummary(row: DataChangeLogRow, isTh: boolean): string {

  const filtered = filterChangesForDisplay(row.field_changes ?? []).filter(

    (c) => c.field !== 'name'

  );

  const snippets: string[] = [];



  for (const field of DISPLAY_PRIORITY) {

    const change = filtered.find((c) => c.field === field);

    if (!change) continue;

    const label = FIELD_LABELS[field]?.[isTh ? 'th' : 'en'] ?? field;

    const val = formatDisplayValue(change.new_value, isTh);

    if (val === null) continue;

    if (field === 'stock' || field === 'order_point' || field === 'target_stock' || field === 'order_qty') {

      snippets.push(`${label} ${val}`);

    } else if (field === 'unit' && val !== '0') {

      snippets.push(`${label}: ${val}`);

    } else if (field === 'source' && val !== '0') {

      snippets.push(`${label}: ${val}`);

    }

    if (snippets.length >= 2) break;

  }



  if (snippets.length === 0) {

    return isTh ? 'เพิ่มเข้าคลังสินค้าแล้ว' : 'Added to inventory';

  }

  return snippets.join(' · ');

}



function buildDeleteSummary(row: DataChangeLogRow, isTh: boolean): string {

  const oldRow = row.old_value as Record<string, unknown> | null;

  const stock = oldRow?.stock;

  const unit = oldRow?.unit;

  if (stock !== undefined && stock !== null) {

    const stockText = formatDisplayValue(stock, isTh);

    const unitText = unit ? formatDisplayValue(unit, isTh) : null;

    if (stockText !== null) {

      return unitText && unitText !== '0'

        ? isTh

          ? `คงเหลือก่อนลบ ${stockText} ${unitText}`

          : `Stock before delete: ${stockText} ${unitText}`

        : isTh

          ? `คงเหลือก่อนลบ ${stockText}`

          : `Stock before delete: ${stockText}`;

    }

  }

  return isTh ? 'นำออกจากคลังแล้ว' : 'Removed from inventory';

}



function buildActionSummary(row: DataChangeLogRow, isTh: boolean): string {

  switch (row.action) {

    case 'CREATE':

      return buildCreateSummary(row, isTh);

    case 'DELETE':

    case 'BULK_DELETE':

      return buildDeleteSummary(row, isTh);

    case 'BULK_UPDATE':

      return isTh ? 'แก้ไขหลายรายการในคลัง' : 'Multiple inventory items updated';

    default:

      return summarizeFieldChanges(row.field_changes ?? [], isTh);

  }

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



export function formatInventoryNotification(

  row: DataChangeLogRow,

  locale: string,

  batchedCount = 1

): InventoryNotification {

  const isTh = locale === 'th';

  const base = logRowToNotificationInput(row);

  const actionLabel = ACTION_LABELS[row.action]?.[isTh ? 'th' : 'en'] ?? row.action;

  const entityName = row.entity_label || (isTh ? 'รายการคลังสินค้า' : 'Inventory item');

  const fieldSummary = buildActionSummary(row, isTh);

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


