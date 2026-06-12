export type ShiftCategory = 'front_store' | 'other_duty' | 'off_or_leave';

export interface DailyShiftEntry {
  row_order: number;
  schedule_order: number;
  name: string;
  shift: string;
  category: ShiftCategory;
}

export interface FormattedDailyShifts {
  front_store: DailyShiftEntry[];
  other_duty: DailyShiftEntry[];
  off_or_leave: DailyShiftEntry[];
  all_staff: DailyShiftEntry[];
}

interface ProfileRow {
  id: string;
  full_name: string;
  schedule_order: number | null;
}

interface ShiftRow {
  employee_id: string | null;
  status?: string | null;
  metadata?: { location?: string | null } | null;
}

export function normalizeShiftLocation(
  raw: string | null | undefined,
  status?: string | null,
): string {
  if (status === 'on_leave') return 'ลา';

  if (!raw || typeof raw !== 'string') return 'วันหยุด';

  const cleaned = raw.replace(/^เข้ากะ\s*/, '').trim();
  if (!cleaned || ['ไม่มีกะ', 'null', 'undefined'].includes(cleaned.toLowerCase())) {
    return 'วันหยุด';
  }

  if (cleaned === 'ลา') return 'ลา';
  if (cleaned === '06:30') return '6:30';
  if (cleaned === '07:00') return '7:00';
  if (cleaned === '08:00') return '8:00';

  return cleaned;
}

export function categorizeShift(shiftText: string): ShiftCategory {
  if (/^\d{1,2}:\d{2}$/.test(shiftText)) return 'front_store';
  if (shiftText === 'ไปสาขา 2' || shiftText === 'ร้านซักผ้า') return 'other_duty';
  return 'off_or_leave';
}

function parseShiftTimeToNumber(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Infinity;
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
}

/** Front-store shifts: earliest time first, then schedule row order, then name. */
export function compareShiftByTimeThenOrder(a: DailyShiftEntry, b: DailyShiftEntry): number {
  const timeDiff = parseShiftTimeToNumber(a.shift) - parseShiftTimeToNumber(b.shift);
  if (timeDiff !== 0) return timeDiff;
  if (a.schedule_order !== b.schedule_order) return a.schedule_order - b.schedule_order;
  return a.name.localeCompare(b.name, 'th');
}

/** Non-timed duties: schedule row order first, then name. */
export function compareShiftByOrderThenName(a: DailyShiftEntry, b: DailyShiftEntry): number {
  if (a.schedule_order !== b.schedule_order) return a.schedule_order - b.schedule_order;
  return a.name.localeCompare(b.name, 'th');
}

/** Working staff in display order: front store (by time) then other duties (by row). */
export function flattenWorkingShiftEntries(formatted: FormattedDailyShifts): DailyShiftEntry[] {
  return [...formatted.front_store, ...formatted.other_duty];
}

export function formatDailyShifts(
  profiles: ProfileRow[],
  shifts: ShiftRow[],
): FormattedDailyShifts {
  const entries: DailyShiftEntry[] = profiles.map((profile, index) => {
    const shift = shifts.find((row) => row.employee_id === profile.id);
    const shiftText = normalizeShiftLocation(
      shift?.metadata?.location ?? undefined,
      shift?.status ?? undefined,
    );

    return {
      row_order: index + 1,
      schedule_order: profile.schedule_order ?? index,
      name: profile.full_name,
      shift: shiftText,
      category: categorizeShift(shiftText),
    };
  });

  const front_store = entries
    .filter((entry) => entry.category === 'front_store')
    .sort(compareShiftByTimeThenOrder);

  const other_duty = entries
    .filter((entry) => entry.category === 'other_duty')
    .sort(compareShiftByOrderThenName);

  const off_or_leave = entries
    .filter((entry) => entry.category === 'off_or_leave')
    .sort(compareShiftByOrderThenName);

  return { front_store, other_duty, off_or_leave, all_staff: entries };
}
