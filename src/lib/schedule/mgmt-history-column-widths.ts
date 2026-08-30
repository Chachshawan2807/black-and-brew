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

interface ThaiDateParts {
  day: number;
  month: number;
  year: number;
  ymd: string;
}

const COLUMN_BOUNDS: Record<string, { min: number; max: number }> = {
  employee_name: { min: 80, max: 196 },
  date_range: { min: 96, max: 184 },
  shift_type: { min: 76, max: 148 },
  remark: { min: 40, max: 160 },
  actions: { min: 96, max: 96 },
};

/** Remarks wrap inside the cell cap width estimate so short text stays tight. */
const REMARK_WRAP_CHAR_CAP = 20;

/** Approximate rendered width at 12–13px font (Thai/Latin mix). */
function estimateTextPx(text: string, cellPadding = 24): number {
  return Math.ceil(text.length * 7.5 + cellPadding);
}

function estimateRemarkPx(remark: string, cellPadding = 24): number {
  const text = remark || '-';
  const effectiveChars = Math.min(text.length, REMARK_WRAP_CHAR_CAP);
  return estimateTextPx('0'.repeat(effectiveChars), cellPadding);
}

function estimateDateRangePx(dateRange: string, cellPadding = 24): number {
  const lines = dateRange.split('\n');
  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const lineHeight = 16;
  return estimateTextPx(' '.repeat(longestLine), cellPadding) + (lines.length - 1) * lineHeight;
}

function clampColumn(id: string, px: number): number {
  const bounds = COLUMN_BOUNDS[id] ?? { min: 60, max: 200 };
  return Math.min(bounds.max, Math.max(bounds.min, px));
}

function parseThaiDateParts(iso: string): ThaiDateParts {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return { day, month, year, ymd: `${match[1]}-${match[2]}-${match[3]}` };
  }

  const date = new Date(iso);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { day, month, year, ymd };
}

function formatThaiDate({ day, month, year }: Pick<ThaiDateParts, 'day' | 'month' | 'year'>): string {
  return `${day}/${month}/${year}`;
}

export function computeMgmtHistoryColumnWidths(
  columns: MgmtHistoryColumnInput[],
  rows: MgmtHistoryRowInput[],
): Record<string, number> {
  const headerById = Object.fromEntries(columns.map((col) => [col.id, col.label]));

  let employeePx = estimateTextPx(headerById.employee_name ?? 'พนักงาน');
  let datePx = estimateTextPx(headerById.date_range ?? 'วันที่');
  let typePx = estimateTextPx(headerById.shift_type ?? 'ประเภท');
  let remarkPx = estimateRemarkPx('-');

  for (const row of rows) {
    employeePx = Math.max(employeePx, estimateTextPx(row.employeeName));
    datePx = Math.max(datePx, estimateDateRangePx(row.dateRange));
    typePx = Math.max(typePx, estimateTextPx(row.shiftTypeLabel));
    remarkPx = Math.max(remarkPx, estimateRemarkPx(row.remark));
  }

  remarkPx = Math.max(remarkPx, estimateTextPx(headerById.remark ?? 'หมายเหตุ'));

  return {
    employee_name: clampColumn('employee_name', employeePx),
    date_range: clampColumn('date_range', datePx),
    shift_type: clampColumn('shift_type', typePx),
    remark: clampColumn('remark', remarkPx),
    actions: COLUMN_BOUNDS.actions.min,
  };
}

export const MGMT_HISTORY_COL_WIDTHS_STORAGE_KEY = 'blackandbrew-shift-history-col-widths-v3';

export function sumMgmtHistoryColumnWidthsPx(columns: { width: string }[]): number {
  return columns.reduce((total, col) => {
    const px = parseInt(col.width, 10);
    return total + (Number.isFinite(px) ? px : 0);
  }, 0);
}

/** Format a management history date range for display and width estimation. */
export function formatMgmtHistoryDateRange(startDate: string, endDate: string): string {
  const start = parseThaiDateParts(startDate);
  if (!endDate) return formatThaiDate(start);

  const end = parseThaiDateParts(endDate);
  if (start.ymd === end.ymd) return formatThaiDate(start);

  const sameMonth = start.month === end.month && start.year === end.year;
  if (sameMonth) {
    return `${start.day}-${end.day}/${start.month}/${start.year}`;
  }

  return `${formatThaiDate(start)} → \n${formatThaiDate(end)}`;
}
