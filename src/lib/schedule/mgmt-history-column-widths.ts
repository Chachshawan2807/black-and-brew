export interface MgmtHistoryColumnInput {
  id: string;
  label: string;
}

export interface MgmtHistoryRowInput {
  employeeName: string;
  dateRange: string;
  shiftTypeLabel: string;
  remark: string;
}

const COLUMN_BOUNDS: Record<string, { min: number; max: number }> = {
  employee_name: { min: 72, max: 196 },
  date_range: { min: 108, max: 184 },
  shift_type: { min: 76, max: 148 },
  remark: { min: 56, max: 288 },
  actions: { min: 96, max: 96 },
};

/** Approximate rendered width at 12–13px font (Thai/Latin mix). */
function estimateTextPx(text: string, cellPadding = 24): number {
  return Math.ceil(text.length * 7.5 + cellPadding);
}

function clampColumn(id: string, px: number): number {
  const bounds = COLUMN_BOUNDS[id] ?? { min: 60, max: 200 };
  return Math.min(bounds.max, Math.max(bounds.min, px));
}

export function computeMgmtHistoryColumnWidths(
  columns: MgmtHistoryColumnInput[],
  rows: MgmtHistoryRowInput[],
): Record<string, number> {
  const headerById = Object.fromEntries(columns.map((col) => [col.id, col.label]));

  let employeePx = estimateTextPx(headerById.employee_name ?? 'พนักงาน');
  let datePx = estimateTextPx(headerById.date_range ?? 'วันที่');
  let typePx = estimateTextPx(headerById.shift_type ?? 'ประเภท');
  let remarkPx = estimateTextPx(headerById.remark ?? 'หมายเหตุ');

  for (const row of rows) {
    employeePx = Math.max(employeePx, estimateTextPx(row.employeeName));
    datePx = Math.max(datePx, estimateTextPx(row.dateRange));
    typePx = Math.max(typePx, estimateTextPx(row.shiftTypeLabel));
    remarkPx = Math.max(remarkPx, estimateTextPx(row.remark || '-'));
  }

  return {
    employee_name: clampColumn('employee_name', employeePx),
    date_range: clampColumn('date_range', datePx),
    shift_type: clampColumn('shift_type', typePx),
    remark: clampColumn('remark', remarkPx),
    actions: COLUMN_BOUNDS.actions.min,
  };
}

export const MGMT_HISTORY_COL_WIDTHS_STORAGE_KEY = 'blackandbrew-shift-history-col-widths-v2';

/** Format a management history date range for display and width estimation. */
export function formatMgmtHistoryDateRange(startDate: string, endDate: string): string {
  const start = formatDatePart(startDate);
  if (!endDate || startDate.split('T')[0] === endDate.split('T')[0]) return start;
  return `${start} → ${formatDatePart(endDate)}`;
}

function formatDatePart(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
