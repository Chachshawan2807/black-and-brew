import { addDays, format } from 'date-fns';
import type { ShiftTypeDisplay } from '@/lib/shift-type-config';
import type { Shift } from '@/types';

export const MGMT_HISTORY_PAGE_SIZE = 80;
export const MGMT_HISTORY_MAX_CHAINED_PAGES = 8;

/** PostgREST OR filter management rows, remark legacy rows, and leave-type legacy rows. */
export const MGMT_HISTORY_QUERY_OR =
  'metadata->is_management.eq.true,metadata->>remark.not.is.null,and(status.eq.on_leave,metadata->>location.eq.ลา)';

export interface ManagementHistoryItem {
  id: string;
  employee_id: string;
  employee_name: string;
  location?: string;
  remark?: string;
  startDate: string;
  endDate: string;
  color: string;
  colorStyle?: React.CSSProperties;
  metadata: Shift['metadata'];
}

export type ManagementHistoryShiftRow = Shift & {
  profiles?: { full_name?: string } | { full_name?: string }[] | null;
};

export function isManagementHistoryShift(shift: Pick<Shift, 'status' | 'metadata'>): boolean {
  if (shift.metadata?.is_management) return true;
  const remark = shift.metadata?.remark?.trim();
  if (remark) return true;
  if (shift.status === 'on_leave') {
    const location = shift.metadata?.location;
    return location === 'ลา' || location === 'on_leave';
  }
  return false;
}

export function resolveMgmtHistoryEmployeeName(shift: ManagementHistoryShiftRow): string {
  const profiles = shift.profiles;
  if (Array.isArray(profiles)) return profiles[0]?.full_name || 'Unknown';
  return profiles?.full_name || 'Unknown';
}

export function mergeManagementHistoryShiftPages(
  existing: ManagementHistoryShiftRow[],
  incoming: ManagementHistoryShiftRow[],
): ManagementHistoryShiftRow[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((shift) => shift.id));
  const appended = incoming.filter((shift) => !seen.has(shift.id));
  return [...existing, ...appended];
}

export function getMgmtHistoryPaginationCursor(
  batch: Array<{ start_time?: string | null }>,
): string | null {
  if (batch.length === 0) return null;
  return batch[batch.length - 1]?.start_time ?? null;
}

export function shouldContinueMgmtHistoryPagination(
  batchLength: number,
  filteredLength: number,
  pagesLoaded: number,
): boolean {
  if (batchLength < MGMT_HISTORY_PAGE_SIZE) return false;
  if (pagesLoaded >= MGMT_HISTORY_MAX_CHAINED_PAGES) return false;
  return filteredLength === 0;
}

function dateOnly(iso: string): string {
  return iso.split('T')[0];
}

function isDateInInclusiveRange(dateIso: string, startDate: string, endDate: string): boolean {
  const value = dateOnly(dateIso);
  return value >= dateOnly(startDate) && value <= dateOnly(endDate);
}

export function buildManagementDateRange(startDate: string, endDate: string): string[] {
  const [startYear, startMonth, startDay] = dateOnly(startDate).split('-').map(Number);
  const [endYear, endMonth, endDay] = dateOnly(endDate).split('-').map(Number);
  const dates: string[] = [];
  const cursor = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function applyManagementSaveToRawShifts(
  existing: ManagementHistoryShiftRow[],
  params: {
    employeeId: string;
    startDate: string;
    endDate: string;
    previousRange?: { employeeId: string; startDate: string; endDate: string };
    inserted: ManagementHistoryShiftRow[];
  },
): ManagementHistoryShiftRow[] {
  const rangesToClear = [
    {
      employeeId: params.employeeId,
      startDate: params.startDate,
      endDate: params.endDate,
    },
  ];

  if (params.previousRange) {
    rangesToClear.push(params.previousRange);
  }

  const shouldRemove = (shift: ManagementHistoryShiftRow) =>
    rangesToClear.some(
      (range) =>
        shift.employee_id === range.employeeId &&
        isDateInInclusiveRange(shift.start_time, range.startDate, range.endDate),
    );

  const kept = existing.filter((shift) => !shouldRemove(shift));
  return [...kept, ...params.inserted];
}

export function groupManagementHistoryShifts(
  shifts: ManagementHistoryShiftRow[],
  shiftTypes: ShiftTypeDisplay[],
): ManagementHistoryItem[] {
  const grouped: ManagementHistoryItem[] = [];
  const sorted = [...shifts].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  sorted.forEach((shift) => {
    const prev = grouped.find(
      (entry) =>
        entry.employee_id === shift.employee_id &&
        entry.metadata?.location === shift.metadata?.location &&
        entry.metadata?.remark === shift.metadata?.remark &&
        format(addDays(new Date(entry.endDate), 1), 'yyyy-MM-dd') ===
          format(new Date(shift.start_time), 'yyyy-MM-dd'),
    );

    const typeMatch = shiftTypes.find((t) => t.value === shift.metadata?.location);

    if (prev) {
      prev.endDate = shift.start_time;
      return;
    }

    grouped.push({
      id: shift.id,
      employee_id: shift.employee_id ?? '',
      employee_name: resolveMgmtHistoryEmployeeName(shift),
      location: shift.metadata?.location,
      remark: shift.metadata?.remark,
      startDate: shift.start_time,
      endDate: shift.start_time,
      color: typeMatch?.className || 'bb-pastel-surface bg-card border-border text-[#000000]',
      colorStyle: typeMatch?.style,
      metadata: { ...shift.metadata },
    });
  });

  return grouped.reverse();
}
