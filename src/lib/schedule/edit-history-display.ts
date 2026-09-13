import type { FieldChange } from '@/lib/data-change-log';

export type ScheduleEditHistoryRow = {
  action: string;
  module: string;
  entity_type: string;
  entity_label: string | null;
  field_changes?: FieldChange[] | null;
  old_value: unknown;
  new_value: unknown;
  metadata: Record<string, unknown>;
};
import {
  expandFieldChanges,
  filterChangesForDisplay,
  formatFieldChange,
  resolveEffectiveFieldChanges,
} from '@/lib/inventory-notification-formatter';
import { normalizeShiftLocation } from '@/lib/schedule/format-daily-shifts';

const SHIFT_STATUS_LABELS: Record<string, { th: string; en: string }> = {
  scheduled: { th: 'เข้างาน', en: 'Scheduled' },
  on_leave: { th: 'ลา', en: 'On leave' },
  completed: { th: 'เสร็จสิ้น', en: 'Completed' },
  swapped: { th: 'สลับกะ', en: 'Swapped' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled' },
};

const SHIFT_HISTORY_HIDDEN_FIELDS = new Set([
  'id',
  'employee_id',
  'end_time',
  'start_time',
  'created_at',
  'updated_at',
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSnapshot(row: ScheduleEditHistoryRow): Record<string, unknown> | null {
  const after = isPlainRecord(row.new_value) ? row.new_value : null;
  const before = isPlainRecord(row.old_value) ? row.old_value : null;
  if (!before && !after) return null;
  const merged: Record<string, unknown> = { ...(before ?? {}) };
  for (const [key, value] of Object.entries(after ?? {})) {
    if (key === 'metadata' && isPlainRecord(value)) {
      const prevMeta = isPlainRecord(merged.metadata) ? merged.metadata : {};
      merged.metadata = { ...prevMeta, ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export function extractScheduleShiftEmployeeId(row: ScheduleEditHistoryRow): string | null {
  const fromMeta = row.metadata?.employeeId;
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();

  const snapshot = readSnapshot(row);
  const fromSnapshot = snapshot?.employee_id;
  if (typeof fromSnapshot === 'string' && fromSnapshot.trim()) return fromSnapshot.trim();

  return null;
}

function resolveStaffName(row: ScheduleEditHistoryRow): string | null {
  const fromMeta = row.metadata?.staffName;
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();

  const label = row.entity_label?.trim();
  if (label) return label;

  return null;
}

function extractWorkDateIso(row: ScheduleEditHistoryRow): string | null {
  const fromMeta = row.metadata?.workDate;
  if (typeof fromMeta === 'string' && fromMeta.trim()) {
    return fromMeta.trim().split('T')[0];
  }

  const snapshot = readSnapshot(row);
  const start = snapshot?.start_time;
  if (typeof start === 'string' && start.trim()) {
    return start.trim().split('T')[0];
  }

  return null;
}

export function formatScheduleWorkDate(isoDate: string, isTh: boolean): string {
  const [y, m, d] = isoDate.split('-').map((part) => Number(part));
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat(isTh ? 'th-TH' : 'en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date);
  const datePart = new Intl.DateTimeFormat(isTh ? 'th-TH' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return `${datePart} (${weekday})`;
}

function formatShiftStatusValue(value: unknown, isTh: boolean): string | null {
  if (value === null || value === undefined || value === '') {
    return isTh ? 'ว่าง' : 'empty';
  }
  const key = String(value).trim();
  const label = SHIFT_STATUS_LABELS[key];
  if (label) return label[isTh ? 'th' : 'en'];
  return key;
}

function formatShiftFieldValue(field: string, value: unknown, isTh: boolean): string | null {
  if (field === 'status') return formatShiftStatusValue(value, isTh);

  if (field === 'metadata.location' || field === 'location') {
    const status =
      typeof value === 'object' && value !== null && 'status' in (value as object)
        ? String((value as { status?: unknown }).status)
        : undefined;
    const raw =
      typeof value === 'string'
        ? value
        : isPlainRecord(value) && typeof value.location === 'string'
          ? value.location
          : null;
    return normalizeShiftLocation(raw, status);
  }

  if (field === 'metadata.remark' || field === 'remark') {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || (isTh ? 'ว่าง' : 'empty');
  }

  if (field === 'metadata.is_management' || field === 'is_management') {
    if (value === true) return isTh ? 'ใช่' : 'yes';
    if (value === false) return isTh ? 'ไม่' : 'no';
  }

  return null;
}

function formatScheduleFieldChange(change: FieldChange, isTh: boolean): string {
  if (change.field === 'metadata.location') {
    const label = isTh ? 'กะ' : 'Shift';
    const oldVal = formatShiftFieldValue('metadata.location', change.old_value, isTh) ?? (isTh ? 'ว่าง' : 'empty');
    const newVal = formatShiftFieldValue('metadata.location', change.new_value, isTh) ?? (isTh ? 'ว่าง' : 'empty');
    if (oldVal === newVal) return '';
    return `${label}: ${oldVal} → ${newVal}`;
  }

  if (change.field === 'metadata.remark') {
    const label = isTh ? 'หมายเหตุ' : 'Remark';
    const oldVal = formatShiftFieldValue('metadata.remark', change.old_value, isTh) ?? (isTh ? 'ว่าง' : 'empty');
    const newVal = formatShiftFieldValue('metadata.remark', change.new_value, isTh) ?? (isTh ? 'ว่าง' : 'empty');
    if (oldVal === newVal) return '';
    return `${label}: ${oldVal} → ${newVal}`;
  }

  if (change.field === 'status') {
    const label = isTh ? 'สถานะ' : 'Status';
    const oldVal = formatShiftStatusValue(change.old_value, isTh);
    const newVal = formatShiftStatusValue(change.new_value, isTh);
    if (oldVal === newVal) return '';
    return `${label}: ${oldVal} → ${newVal}`;
  }

  return formatFieldChange(change, isTh);
}

function filterShiftChanges(changes: FieldChange[]): FieldChange[] {
  return filterChangesForDisplay(changes).filter((change) => {
    if (SHIFT_HISTORY_HIDDEN_FIELDS.has(change.field)) return false;
    if (change.field.startsWith('metadata.') && change.field === 'metadata.is_management') {
      return change.old_value !== change.new_value;
    }
    return true;
  });
}

function buildManagementRangeDetail(row: ScheduleEditHistoryRow, isTh: boolean): string | null {
  const operation = row.metadata?.operation;
  if (operation !== 'save_management_history_range') return null;

  const staffName =
    (typeof row.metadata?.staffName === 'string' && row.metadata.staffName.trim()) ||
    resolveStaffName(row);
  const startDate = row.metadata?.startDate as string | undefined;
  const endDate = row.metadata?.endDate as string | undefined;
  const shiftType = row.metadata?.shiftType as string | undefined;
  const count = row.metadata?.count as number | undefined;

  const shiftLabel = shiftType ? normalizeShiftLocation(shiftType) : null;
  const range =
    startDate && endDate
      ? startDate === endDate
        ? formatScheduleWorkDate(startDate.split('T')[0], isTh)
        : `${formatScheduleWorkDate(startDate.split('T')[0], isTh)} – ${formatScheduleWorkDate(endDate.split('T')[0], isTh)}`
      : null;

  const parts: string[] = [];
  if (staffName) parts.push(staffName);
  if (range) parts.push(range);
  if (shiftLabel) parts.push(isTh ? `กะ ${shiftLabel}` : `Shift ${shiftLabel}`);
  if (count != null && count > 1) {
    parts.push(isTh ? `${count} วัน` : `${count} days`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function resolveActionLabel(action: string, isTh: boolean): string {
  switch (action) {
    case 'CREATE':
      return isTh ? 'เพิ่มกะ' : 'Shift added';
    case 'DELETE':
      return isTh ? 'ลบกะ' : 'Shift removed';
    case 'UPDATE':
      return isTh ? 'แก้ไขกะ' : 'Shift updated';
    case 'BULK_UPDATE':
      return isTh ? 'แก้ไขกะหลายวัน' : 'Multiple shifts updated';
    default:
      return isTh ? 'ตารางงาน' : 'Schedule';
  }
}

/** Readable headline + detail for schedule shift rows in settings edit history. */
export function formatScheduleShiftEditHistoryDisplay(
  row: ScheduleEditHistoryRow,
  locale: string,
): { headline: string; detail: string; detailLines?: string[] } {
  const isTh = locale === 'th';

  const managementDetail = buildManagementRangeDetail(row, isTh);
  if (managementDetail) {
    const staffName = resolveStaffName(row);
    const headline = staffName
      ? `${resolveActionLabel(row.action, isTh)} · ${staffName}`
      : resolveActionLabel(row.action, isTh);
    return {
      headline,
      detail: managementDetail,
      detailLines: [managementDetail],
    };
  }

  const staffName = resolveStaffName(row);
  const workDateIso = extractWorkDateIso(row);
  const workDateLabel = workDateIso ? formatScheduleWorkDate(workDateIso, isTh) : null;

  const headlineParts = [resolveActionLabel(row.action, isTh)];
  if (staffName) headlineParts.push(staffName);
  if (workDateLabel) headlineParts.push(workDateLabel);
  const headline = headlineParts.join(' · ');

  const resolvedRow = {
    ...row,
    field_changes: expandFieldChanges(resolveEffectiveFieldChanges(row)),
  };

  const changeLines = filterShiftChanges(resolvedRow.field_changes ?? [])
    .map((change) => formatScheduleFieldChange(change, isTh))
    .filter((line) => line.length > 0);

  const snapshot = readSnapshot(row);
  const meta = isPlainRecord(snapshot?.metadata) ? snapshot.metadata : null;
  const currentShift =
    meta && typeof meta.location === 'string'
      ? normalizeShiftLocation(meta.location, typeof snapshot?.status === 'string' ? snapshot.status : undefined)
      : null;

  const detailLines: string[] = [...changeLines];

  if (detailLines.length === 0 && row.action === 'CREATE' && currentShift) {
    detailLines.push(isTh ? `กะ: ${currentShift}` : `Shift: ${currentShift}`);
  }

  if (detailLines.length === 0 && row.action === 'DELETE') {
    const deletedShift = isPlainRecord(row.old_value)
      ? normalizeShiftLocation(
          typeof row.old_value.metadata === 'object' && row.old_value.metadata !== null
            ? (row.old_value.metadata as { location?: string }).location
            : undefined,
          typeof row.old_value.status === 'string' ? row.old_value.status : undefined,
        )
      : null;
    if (deletedShift) {
      detailLines.push(isTh ? `กะเดิม: ${deletedShift}` : `Previous shift: ${deletedShift}`);
    }
  }

  const detail = detailLines.join(' · ');
  return {
    headline,
    detail: detail || (isTh ? 'อัปเดตตารางงานแล้ว' : 'Schedule updated'),
    detailLines: detailLines.length > 0 ? detailLines : undefined,
  };
}
