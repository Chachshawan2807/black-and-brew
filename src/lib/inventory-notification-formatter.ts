import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';

import type { FieldChange } from '@/lib/data-change-log';

import { computeFieldChanges } from '@/lib/data-change-log';

import type { InventoryNotification, NotificationPriority } from '@/lib/notification-types';

import { logRowToNotificationInput } from '@/lib/notification-types';
import { detectStockOperationFromMetadata } from '@/lib/notification-display-icon';

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

  employee_id: { th: 'พนักงาน', en: 'Employee' },

  start_time: { th: 'วันที่เริ่ม', en: 'Start date' },

  end_time: { th: 'วันที่สิ้นสุด', en: 'End date' },

  status: { th: 'สถานะ', en: 'Status' },

  metadata: { th: 'รายละเอียดกะ', en: 'Shift details' },

  full_name: { th: 'ชื่อพนักงาน', en: 'Staff name' },

  schedule_order: { th: 'ลำดับในตาราง', en: 'Schedule order' },

  display_order: { th: 'ลำดับแสดงผล', en: 'Display order' },

  dashboard_order: { th: 'ลำดับแดชบอร์ด', en: 'Dashboard order' },

  category: { th: 'หมวดหมู่', en: 'Category' },

  product_name: { th: 'ชื่อสินค้า', en: 'Product' },

  quantity: { th: 'จำนวน', en: 'Quantity' },

  total_amount: { th: 'ยอดรวม', en: 'Total' },

  unit_price: { th: 'ราคาต่อหน่วย', en: 'Unit price' },

  sale_date: { th: 'วันที่ขาย', en: 'Sale date' },

  payment_method: { th: 'ช่องทางชำระ', en: 'Payment' },

  notes: { th: 'หมายเหตุ', en: 'Notes' },

  is_ai_generated: { th: 'สร้างโดย AI', en: 'AI generated' },

  start_date: { th: 'วันที่เริ่ม', en: 'Start date' },

  equipment: { th: 'อุปกรณ์', en: 'Equipment' },

  detected_problem: { th: 'ปัญหาที่พบ', en: 'Detected problem' },

  task_type: { th: 'ประเภทงาน', en: 'Task type' },

  work_details: { th: 'รายละเอียดงาน', en: 'Work details' },

  recommended_frequency: { th: 'ความถี่แนะนำ', en: 'Recommended frequency' },

  cost: { th: 'ค่าใช้จ่าย', en: 'Cost' },

  person_in_charge: { th: 'ผู้รับผิดชอบ', en: 'Person in charge' },

  completion_date: { th: 'วันที่เสร็จ', en: 'Completion date' },

  days: { th: 'วันหยุดประจำ', en: 'Regular days off' },

  date: { th: 'วันที่', en: 'Date' },

  day_of_week: { th: 'วันในสัปดาห์', en: 'Day of week' },

};



const METADATA_FIELD_LABELS: Record<string, { th: string; en: string }> = {

  location: { th: 'สถานที่', en: 'Location' },

  is_management: { th: 'กะจัดการ', en: 'Management shift' },

  shift_type: { th: 'ประเภทกะ', en: 'Shift type' },

  note: { th: 'หมายเหตุ', en: 'Note' },

};



const DAY_NAMES_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];



const ACTION_LABELS: Record<string, { th: string; en: string }> = {

  CREATE: { th: 'เพิ่มรายการ', en: 'Item added' },

  UPDATE: { th: 'แก้ไขรายการ', en: 'Item updated' },

  DELETE: { th: 'ลบรายการ', en: 'Item deleted' },

  BULK_UPDATE: { th: 'แก้ไขหลายรายการ', en: 'Bulk update' },

  BULK_DELETE: { th: 'ลบหลายรายการ', en: 'Bulk delete' },

};



const STOCK_OPERATION_LABELS: Record<'IN' | 'OUT' | 'ADJUST', { th: string; en: string }> = {

  IN: { th: 'รับเข้า', en: 'Stock in' },

  OUT: { th: 'นำออก', en: 'Stock out' },

  ADJUST: { th: 'ปรับจำนวน', en: 'Stock adjusted' },

};



type StockOperation = 'IN' | 'OUT' | 'ADJUST';



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



function formatFieldLabel(field: string, isTh: boolean): string {

  if (field.startsWith('metadata.')) {

    const sub = field.slice('metadata.'.length);

    return METADATA_FIELD_LABELS[sub]?.[isTh ? 'th' : 'en'] ?? sub;

  }

  return FIELD_LABELS[field]?.[isTh ? 'th' : 'en'] ?? field;

}



function formatDayList(days: unknown, isTh: boolean): string {

  if (!Array.isArray(days)) return formatDisplayValue(days, isTh) ?? (isTh ? 'ไม่มี' : 'None');

  const names = isTh ? DAY_NAMES_TH : DAY_NAMES_EN;

  if (days.length === 0) return isTh ? 'ไม่มี' : 'None';

  return days.map((d) => names[Number(d)] ?? String(d)).join(', ');

}



function isPlainRecord(value: unknown): value is Record<string, unknown> {

  return typeof value === 'object' && value !== null && !Array.isArray(value);

}



function formatDisplayValue(value: unknown, isTh: boolean): string | null {

  if (value === null || value === undefined) {

    return isTh ? '0' : '0';

  }

  if (value === '') {

    return isTh ? 'ว่าง' : 'empty';

  }

  if (typeof value === 'boolean') {

    return value ? (isTh ? 'ใช่' : 'yes') : (isTh ? 'ไม่' : 'no');

  }

  if (typeof value === 'number' && !Number.isNaN(value)) {

    return String(value);

  }

  if (Array.isArray(value)) {

    if (value.every((entry) => typeof entry === 'number' && entry >= 0 && entry <= 6)) {

      return formatDayList(value, isTh);

    }

    const parts = value

      .map((entry) => formatDisplayValue(entry, isTh))

      .filter((entry): entry is string => entry != null && entry.length > 0);

    return parts.length > 0 ? parts.join(', ') : (isTh ? 'ว่าง' : 'empty');

  }

  if (isPlainRecord(value)) {

    const parts = Object.entries(value)

      .map(([key, entry]) => {

        const label = formatFieldLabel(key, isTh);

        const formatted = formatDisplayValue(entry, isTh);

        return formatted != null ? `${label}: ${formatted}` : null;

      })

      .filter((entry): entry is string => entry != null);

    if (parts.length === 0) return null;

    const joined = parts.join(', ');

    return joined.length > 80 ? `${joined.slice(0, 77)}…` : joined;

  }

  const text = String(value).trim();

  if (!text) return isTh ? 'ว่าง' : 'empty';

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

  const label = formatFieldLabel(change.field, isTh);

  if (change.field === 'days' || change.field === 'day_of_week') {

    const oldVal = formatDayList(change.old_value, isTh);

    const newVal = formatDayList(change.new_value, isTh);

    if (oldVal === newVal) return '';

    return `${label}: ${oldVal} → ${newVal}`;

  }

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

  maxFields = 2,

  options?: { includeName?: boolean }

): string {

  const filtered = filterChangesForDisplay(changes)

    .filter((c) => options?.includeName || c.field !== 'name')

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

    default: {

      const stockOp = detectStockOperation(row);

      if (stockOp) return buildStockOperationSummary(row, stockOp, isTh);

      return summarizeFieldChanges(row.field_changes ?? [], isTh);

    }

  }

}



export function detectStockOperation(row: DataChangeLogRow): StockOperation | null {
  return detectStockOperationFromMetadata(row.metadata ?? {}, row.module);
}



export function resolveEntityName(row: DataChangeLogRow, isTh: boolean): string {

  if (row.entity_label?.trim()) return row.entity_label.trim();

  const meta = row.metadata ?? {};

  if (typeof meta.itemName === 'string' && meta.itemName.trim()) {

    return meta.itemName.trim();

  }

  const nameChange = row.field_changes?.find((c) => c.field === 'name');

  const fromChange = nameChange?.new_value ?? nameChange?.old_value;

  if (typeof fromChange === 'string' && fromChange.trim()) {

    return fromChange.trim();

  }

  if (row.action === 'DELETE' || row.action === 'BULK_DELETE') {

    const oldRow = row.old_value as Record<string, unknown> | null;

    if (typeof oldRow?.name === 'string' && oldRow.name.trim()) {

      return oldRow.name.trim();

    }

  }

  return isTh ? 'รายการคลังสินค้า' : 'Inventory item';

}



function buildStockOperationSummary(

  row: DataChangeLogRow,

  operation: StockOperation,

  isTh: boolean

): string {

  const meta = row.metadata ?? {};

  const stockChange = row.field_changes?.find((c) => c.field === 'stock');

  const stockLine = stockChange ? formatFieldChange(stockChange, isTh) : '';

  const qty = meta.quantity != null ? Number(meta.quantity) : NaN;



  if (operation === 'IN' && !Number.isNaN(qty)) {

    const lead = isTh ? `รับ ${qty}` : `Received ${qty}`;

    return stockLine ? `${lead} · ${stockLine}` : lead;

  }

  if (operation === 'OUT' && !Number.isNaN(qty)) {

    const lead = isTh ? `นำออก ${qty}` : `Removed ${qty}`;

    return stockLine ? `${lead} · ${stockLine}` : lead;

  }

  if (operation === 'ADJUST' && stockChange) {

    const newVal = formatDisplayValue(stockChange.new_value, isTh);

    const lead =

      newVal != null

        ? isTh

          ? `ปรับเป็น ${newVal}`

          : `Set to ${newVal}`

        : isTh

          ? 'ปรับจำนวนคงเหลือ'

          : 'Stock level adjusted';

    return stockLine ? `${lead} · ${stockLine}` : lead;

  }

  return stockLine || (isTh ? 'อัปเดตสต็อกแล้ว' : 'Stock updated');

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

  const entityName = resolveEntityName(row, isTh);

  const stockOp = detectStockOperation(row);

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

  } else if (stockOp) {

    const opLabel = STOCK_OPERATION_LABELS[stockOp][isTh ? 'th' : 'en'];

    title = `${opLabel}: ${entityName}`;

    summary = fieldSummary;

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

    metadata: {
      ...base.metadata,
      module: row.module,
    },

  };

}



export function formatBatchedNotification(

  latest: DataChangeLogRow,

  count: number,

  locale: string

): InventoryNotification {

  return formatInventoryNotification(latest, locale, count);

}



/** Builds one notification from a batched group (e.g. bulk quick-action entries). */
export function formatBatchedNotificationFromRows(
  rows: DataChangeLogRow[],
  locale: string
): InventoryNotification {
  if (rows.length === 0) {
    throw new Error('formatBatchedNotificationFromRows requires at least one row');
  }
  if (rows.length === 1) {
    return formatInventoryNotification(rows[0], locale);
  }

  const isTh = locale === 'th';
  const latest = rows[rows.length - 1];
  const base = formatInventoryNotification(latest, locale, rows.length);
  const stockOps = rows.map((row) => detectStockOperation(row)).filter(Boolean) as StockOperation[];
  const allStockOps = stockOps.length === rows.length;

  if (!allStockOps) {
    return base;
  }

  const bulkType = rows[0].metadata?.type as string | undefined;
  const sameBulkType = rows.every(
    (row) => (row.metadata?.type as string | undefined) === bulkType
  );
  const op: StockOperation =
    sameBulkType && (bulkType === 'IN' || bulkType === 'OUT')
      ? bulkType
      : rows.every((row) => detectStockOperation(row) === 'ADJUST')
        ? 'ADJUST'
        : 'IN';

  const opLabel = STOCK_OPERATION_LABELS[op][isTh ? 'th' : 'en'];
  const lines = rows
    .map((row) => {
      const name = resolveEntityName(row, isTh);
      const qty = row.metadata?.quantity != null ? Number(row.metadata.quantity) : NaN;
      if (op === 'IN' && !Number.isNaN(qty)) {
        return isTh ? `${name} +${qty}` : `${name} +${qty}`;
      }
      if (op === 'OUT' && !Number.isNaN(qty)) {
        return isTh ? `${name} −${qty}` : `${name} −${qty}`;
      }
      const stockChange = row.field_changes?.find((c) => c.field === 'stock');
      const newVal = stockChange ? formatDisplayValue(stockChange.new_value, isTh) : null;
      return newVal != null ? `${name} → ${newVal}` : name;
    })
    .filter(Boolean);

  const maxLines = 4;
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    shown.push(
      isTh ? `และอีก ${lines.length - maxLines} รายการ` : `and ${lines.length - maxLines} more`
    );
  }

  return {
    ...base,
    title: isTh
      ? `${opLabel}: ${rows.length} รายการ`
      : `${opLabel}: ${rows.length} items`,
    summary: shown.join(' · '),
    fieldSummary: shown.join(' · '),
    batchedCount: rows.length,
  };
}



const GENERIC_MODULE_LABELS: Record<string, { th: string; en: string }> = {

  inventory: { th: 'คลังสินค้า', en: 'Inventory' },

  schedule: { th: 'ตารางงาน', en: 'Schedule' },

  sales: { th: 'ยอดขาย', en: 'Sales' },

  maintenance: { th: 'ซ่อมบำรุง', en: 'Maintenance' },

  holiday: { th: 'วันหยุด', en: 'Holidays' },

  dashboard: { th: 'แดชบอร์ด', en: 'Dashboard' },

  settings: { th: 'ตั้งค่า', en: 'Settings' },

  market_insights: { th: 'ข้อมูลตลาด', en: 'Market insights' },

};



const GENERIC_ACTION_LABELS: Record<string, { th: string; en: string }> = {

  CREATE: { th: 'เพิ่ม', en: 'Added' },

  UPDATE: { th: 'แก้ไข', en: 'Edited' },

  DELETE: { th: 'ลบ', en: 'Deleted' },

  BULK_UPDATE: { th: 'แก้ไขหลายรายการ', en: 'Bulk edit' },

  BULK_DELETE: { th: 'ลบหลายรายการ', en: 'Bulk delete' },

};



export function resolveEffectiveFieldChanges(row: DataChangeLogRow): FieldChange[] {

  const explicit = row.field_changes ?? [];

  if (explicit.length > 0) return explicit;



  const before = isPlainRecord(row.old_value) ? row.old_value : null;

  const after = isPlainRecord(row.new_value) ? row.new_value : null;

  if (before || after) {

    return computeFieldChanges(before, after);

  }



  return [];

}



function expandFieldChanges(changes: FieldChange[]): FieldChange[] {

  const expanded: FieldChange[] = [];



  for (const change of changes) {

    if (change.field === 'metadata') {

      const before = isPlainRecord(change.old_value) ? change.old_value : null;

      const after = isPlainRecord(change.new_value) ? change.new_value : null;

      const nested = computeFieldChanges(before, after);

      if (nested.length > 0) {

        for (const entry of nested) {

          expanded.push({

            field: `metadata.${entry.field}`,

            old_value: entry.old_value,

            new_value: entry.new_value,

          });

        }

        continue;

      }

    }

    expanded.push(change);

  }



  return expanded;

}



function withResolvedFieldChanges(row: DataChangeLogRow): DataChangeLogRow {

  return {

    ...row,

    field_changes: expandFieldChanges(resolveEffectiveFieldChanges(row)),

  };

}



function buildMetadataOperationDetail(row: DataChangeLogRow, isTh: boolean): string | null {

  const operation = row.metadata?.operation as string | undefined;

  if (!operation) return null;

  const meta = row.metadata ?? {};



  switch (operation) {

    case 'batch_update_profile_names': {

      const count = meta.count as number | undefined;

      const nameChanges = meta.nameChanges as

        | { label?: string; old_value: string | null; new_value: string }[]

        | undefined;

      if (nameChanges && nameChanges.length > 0) {

        return nameChanges

          .map((change) => {

            const label = change.label?.trim() || (isTh ? 'พนักงาน' : 'Staff');

            const oldVal = formatDisplayValue(change.old_value, isTh) ?? (isTh ? 'ว่าง' : 'empty');

            const newVal = formatDisplayValue(change.new_value, isTh) ?? (isTh ? 'ว่าง' : 'empty');

            return `${label}: ${oldVal} → ${newVal}`;

          })

          .join(' · ');

      }

      return count != null

        ? isTh

          ? `เปลี่ยนชื่อพนักงาน ${count} คน`

          : `Renamed ${count} staff members`

        : isTh

          ? 'เปลี่ยนชื่อพนักงาน'

          : 'Staff names updated';

    }

    case 'update_staff_order':

      return isTh ? 'จัดลำดับพนักงานในตารางงานใหม่' : 'Reordered staff in schedule';

    case 'update_dashboard_order':

      return isTh ? 'จัดลำดับพนักงานในแดชบอร์ดใหม่' : 'Reordered staff on dashboard';

    case 'delete_management_history': {

      const start = meta.startDate as string | undefined;

      const end = meta.endDate as string | undefined;

      if (start && end) {

        return isTh

          ? `ลบประวัติกะจัดการ ${start} ถึง ${end}`

          : `Deleted management shifts from ${start} to ${end}`;

      }

      return isTh ? 'ลบประวัติกะจัดการ' : 'Deleted management shift history';

    }

    case 'sync_holidays': {

      const count = meta.count as number | undefined;

      const start = meta.startDate as string | undefined;

      const end = meta.endDate as string | undefined;

      if (start && end && count != null) {

        return isTh

          ? `ซิงค์วันหยุด ${start}–${end} (${count} วัน)`

          : `Synced holidays ${start}–${end} (${count} days)`;

      }

      return isTh ? 'ซิงค์วันหยุด' : 'Holidays synced';

    }

    case 'reorder_rows':

      return isTh ? 'จัดลำดับรายการใหม่' : 'Rows reordered';

    case 'reorder_sort_order': {

      const ids = meta.itemIds as string[] | undefined;

      const count = ids?.length;

      return count != null

        ? isTh

          ? `จัดลำดับ ${count} รายการ`

          : `Reordered ${count} items`

        : isTh

          ? 'จัดลำดับรายการใหม่'

          : 'Items reordered';

    }

    case 'undo_redo_sync': {

      const count = meta.itemCount as number | undefined;

      return count != null

        ? isTh

          ? `ย้อนกลับ/ทำซ้ำ ${count} รายการ`

          : `Undo/redo sync (${count} items)`

        : isTh

          ? 'ย้อนกลับ/ทำซ้ำ'

          : 'Undo/redo sync';

    }

    default:

      return null;

  }

}



function buildCreateFallback(row: DataChangeLogRow, isTh: boolean): string {

  const snapshot = isPlainRecord(row.new_value) ? row.new_value : null;

  if (!snapshot) {

    return isTh ? 'เพิ่มรายการใหม่' : 'New item added';

  }

  const parts = Object.entries(snapshot)

    .filter(([key]) => !HIDDEN_NOTIFICATION_FIELDS.has(key))

    .map(([key, value]) => {

      const formatted = formatDisplayValue(value, isTh);

      if (formatted == null) return '';

      return `${formatFieldLabel(key, isTh)}: ${formatted}`;

    })

    .filter((line) => line.length > 0);

  return parts.length > 0 ? parts.join(' · ') : (isTh ? 'เพิ่มรายการใหม่' : 'New item added');

}



function buildDeleteFallback(row: DataChangeLogRow, isTh: boolean): string {

  if (row.entity_label?.trim()) {

    return isTh ? `ลบ: ${row.entity_label.trim()}` : `Deleted: ${row.entity_label.trim()}`;

  }

  const snapshot = isPlainRecord(row.old_value) ? row.old_value : row.old_value;

  if (snapshot != null) {

    const formatted = formatDisplayValue(snapshot, isTh);

    if (formatted != null) {

      return isTh ? `ลบ: ${formatted}` : `Deleted: ${formatted}`;

    }

  }

  return isTh ? 'ลบรายการแล้ว' : 'Item deleted';

}



function buildHistoryDetail(row: DataChangeLogRow, isTh: boolean): string {

  const resolvedRow = withResolvedFieldChanges(row);

  const metaDetail = buildMetadataOperationDetail(resolvedRow, isTh);

  const changeLines = filterChangesForDisplay(resolvedRow.field_changes ?? [])

    .map((c) => formatFieldChange(c, isTh))

    .filter((line) => line.length > 0);



  if (row.module === 'inventory') {

    const stockOp = detectStockOperation(row);



    switch (row.action) {

      case 'CREATE':

        return changeLines.length > 0 ? changeLines.join(' · ') : buildCreateSummary(resolvedRow, isTh);

      case 'DELETE':

      case 'BULK_DELETE':

        return changeLines.length > 0 ? changeLines.join(' · ') : buildDeleteSummary(row, isTh);

      case 'BULK_UPDATE': {

        if (changeLines.length > 0) return changeLines.join(' · ');

        if (metaDetail) return metaDetail;

        return isTh ? 'แก้ไขหลายรายการในคลัง' : 'Multiple inventory items updated';

      }

      default: {

        if (stockOp) return buildStockOperationSummary(row, stockOp, isTh);

        if (changeLines.length > 0) return changeLines.join(' · ');

        return summarizeFieldChanges(resolvedRow.field_changes ?? [], isTh, 50, { includeName: true });

      }

    }

  }



  switch (row.action) {

    case 'CREATE':

      if (changeLines.length > 0) return changeLines.join(' · ');

      if (metaDetail) return metaDetail;

      return buildCreateFallback(row, isTh);

    case 'DELETE':

    case 'BULK_DELETE':

      if (changeLines.length > 0) return changeLines.join(' · ');

      if (metaDetail) return metaDetail;

      return buildDeleteFallback(row, isTh);

    case 'BULK_UPDATE':

      if (changeLines.length > 0) return changeLines.join(' · ');

      if (metaDetail) return metaDetail;

      return isTh ? 'แก้ไขหลายรายการ' : 'Bulk update';

    default:

      if (changeLines.length > 0) return changeLines.join(' · ');

      if (metaDetail) return metaDetail;

      return isTh ? 'อัปเดตข้อมูลแล้ว' : 'Data updated';

  }

}



/** Headline + detail for settings edit history (shows full from→to diffs). */

export function formatDataChangeLogDisplay(

  row: DataChangeLogRow,

  locale: string

): { headline: string; detail: string } {

  const isTh = locale === 'th';



  if (row.module === 'inventory') {

    const formatted = formatInventoryNotification(row, locale);

    return { headline: formatted.title, detail: buildHistoryDetail(row, isTh) };

  }



  const actionLabel = GENERIC_ACTION_LABELS[row.action]?.[isTh ? 'th' : 'en'] ?? row.action;

  const moduleLabel = GENERIC_MODULE_LABELS[row.module]?.[isTh ? 'th' : 'en'] ?? row.module;

  const entityName = row.entity_label?.trim();



  const headline = entityName

    ? `${actionLabel}: ${entityName}`

    : `${actionLabel} · ${moduleLabel}`;



  const detail = buildHistoryDetail(row, isTh);



  return { headline, detail };

}


