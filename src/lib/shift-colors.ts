/** Pastel shift colors — lookups use shift-type-config when available (client) */
import {
  DEFAULT_SHIFT_TYPES,
  buildShiftDisplay,
  findShiftTypeByLocation,
  getClientShiftTypes,
  type ShiftTypeEntry,
} from '@/lib/shift-type-config';

/** LINE Flex Message palettes — hex pairs aligned with Tailwind classes below */
export type ShiftFlexPalette = { backgroundColor: string; borderColor: string };

const LEGACY_FLEX_PALETTES = {
  '6:30': { backgroundColor: '#d4edda', borderColor: '#c3e6cb' },
  '06:30': { backgroundColor: '#d4edda', borderColor: '#c3e6cb' },
  '7:00': { backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  '07:00': { backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  '8:00': { backgroundColor: '#fff3cd', borderColor: '#ffeeba' },
  '08:00': { backgroundColor: '#fff3cd', borderColor: '#ffeeba' },
  'ร้านซักผ้า': { backgroundColor: '#d1ecf1', borderColor: '#bee5eb' },
  'ไปสาขา 2': { backgroundColor: '#d1ecf1', borderColor: '#bee5eb' },
  'ลา': { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' },
  'วันหยุด': { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' },
} as const satisfies Record<string, ShiftFlexPalette>;

export const FLEX_HEADER_PALETTE: ShiftFlexPalette = {
  backgroundColor: '#fdfcf0',
  borderColor: '#e8e4d4',
};

export const FLEX_HOLIDAY_PALETTE: ShiftFlexPalette = {
  backgroundColor: '#fff3cd',
  borderColor: '#ffeeba',
};

export const FLEX_MUTED_TEXT = '#6b7280';
export const FLEX_BODY_TEXT = '#111111';

const PASTEL = 'bb-pastel-surface text-[#000000]';

export const DASHBOARD_STAT_COLORS = {
  work: `${PASTEL} bg-[#d4edda] border border-[#c3e6cb]`,
  leave: `${PASTEL} bg-[#f8d7da] border border-[#f5c6cb]`,
  holiday: `${PASTEL} bg-[#fff3cd] border border-[#ffeeba]`,
} as const;

/** Inventory Quick Action — same muted pastels as schedule/dashboard, black text */
export const INVENTORY_QUICK_ACTION_COLORS = {
  in: `${PASTEL} bg-[#d4edda] border border-[#c3e6cb]`,
  out: `${PASTEL} bg-[#f8d7da] border border-[#f5c6cb]`,
  adjust: `${PASTEL} bg-[#fff3cd] border border-[#ffeeba]`,
  order: `${PASTEL} bg-[#d1ecf1] border border-[#bee5eb]`,
  addItem: `${PASTEL} bg-[#d1ecf1] border border-[#bee5eb]`,
  history: `${PASTEL} bg-[#d1ecf1] border border-[#bee5eb]`,
  toggleTrack: 'bg-muted/80 border border-border',
  inactive: 'text-muted-foreground hover:text-foreground',
} as const;

/** วันหยุด — โทนเดียวกับกะลา */
export const DAY_OFF_COLOR = `${PASTEL} bg-[#f8d7da] border border-[#f5c6cb]`;

/** Morning Latte Cream — primary surface (`--background`, design.md `--bg-primary`) */
export const MORNING_LATTE_CREAM = 'bg-card border border-border';

/** Sales dashboard — pastel section accents aligned with schedule/inventory palette */
export const SALES_SECTION_COLORS = {
  headerIcon: `${PASTEL} bg-[#d4edda] border border-[#c3e6cb]`,
  upload: MORNING_LATTE_CREAM,
  revenue: `${PASTEL} bg-[#d4edda] border border-[#c3e6cb]`,
  quantity: `${PASTEL} bg-[#fff3cd] border border-[#ffeeba]`,
  menuItems: `${PASTEL} bg-[#f8d7da] border border-[#f5c6cb]`,
  categories: MORNING_LATTE_CREAM,
  chart: MORNING_LATTE_CREAM,
  topProducts: MORNING_LATTE_CREAM,
  table: 'bg-card border border-border',
  empty: `${PASTEL} bg-[#fff3cd] border border-[#ffeeba]`,
} as const;

export const SALES_CATEGORY_CARD_COLORS = [
  `${PASTEL} bg-[#d4edda] border-[#c3e6cb]`,
  `${PASTEL} bg-[#d1ecf1] border-[#bee5eb]`,
  `${PASTEL} bg-[#fff3cd] border-[#ffeeba]`,
  `${PASTEL} bg-[#f8d7da] border-[#f5c6cb]`,
  `${PASTEL} bg-[#e6f0ff] border-[#c2d6ff]`,
  `${PASTEL} bg-[#f3e8ff] border-[#d8b4fe]`,
] as const;

export { PASTEL as PASTEL_SURFACE };

function resolveTypes(): ShiftTypeEntry[] {
  if (typeof window !== 'undefined') {
    return getClientShiftTypes();
  }
  return DEFAULT_SHIFT_TYPES;
}

function entryToFlexPalette(entry: ShiftTypeEntry): ShiftFlexPalette {
  return { backgroundColor: entry.bgColor, borderColor: entry.borderColor };
}

export function getShiftFlexPalette(location: string, status?: string): ShiftFlexPalette {
  const loc = location.replace(/^เข้ากะ\s*/, '').trim();
  const types = resolveTypes();

  if (status === 'on_leave' || loc === 'ลา') {
    const leave = findShiftTypeByLocation('ลา', types);
    if (leave) return entryToFlexPalette(leave);
    return LEGACY_FLEX_PALETTES['ลา'];
  }

  const matched = findShiftTypeByLocation(loc, types);
  if (matched) return entryToFlexPalette(matched);

  if (!loc || loc === 'วันหยุด') {
    return LEGACY_FLEX_PALETTES['วันหยุด'];
  }

  const direct = LEGACY_FLEX_PALETTES[loc as keyof typeof LEGACY_FLEX_PALETTES];
  if (direct) return direct;

  return LEGACY_FLEX_PALETTES['ร้านซักผ้า'];
}

export function getShiftColorClass(location: string, status?: string): string {
  const loc = location.replace(/^เข้ากะ\s*/, '').trim();
  const types = resolveTypes();

  if (status === 'on_leave' || loc === 'ลา') {
    const leave = findShiftTypeByLocation('ลา', types);
    if (leave) return buildShiftDisplay(leave).className;
    return `${PASTEL} bg-[#f8d7da] border border-[#f5c6cb]`;
  }

  const matched = findShiftTypeByLocation(loc, types);
  if (matched) return buildShiftDisplay(matched).className;

  if (!loc) return `${PASTEL} bg-[#ffffff] border border-gray-300`;

  return `${PASTEL} bg-[#d1ecf1] border border-[#bee5eb]`;
}

export type ShiftColorStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

const FALLBACK_SHIFT_STYLE: ShiftColorStyle = {
  backgroundColor: '#d1ecf1',
  borderColor: '#bee5eb',
  color: '#000000',
};

/** Inline pastel colors — same source as schedule table cells (buildShiftDisplay) */
export function getShiftColorStyle(location: string, status?: string): ShiftColorStyle {
  const loc = location.replace(/^เข้ากะ\s*/, '').trim();
  const types = resolveTypes();

  if (status === 'on_leave' || loc === 'ลา') {
    const leave = findShiftTypeByLocation('ลา', types);
    if (leave) return buildShiftDisplay(leave).style;
    return { backgroundColor: '#f8d7da', borderColor: '#f5c6cb', color: '#000000' };
  }

  const matched = findShiftTypeByLocation(loc, types);
  if (matched) return buildShiftDisplay(matched).style;

  if (!loc) {
    return { backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#000000' };
  }

  return FALLBACK_SHIFT_STYLE;
}

export function getShiftDisplayText(location: string, status?: string): string {
  const loc = location.replace(/^เข้ากะ\s*/, '').trim();
  const types = resolveTypes();

  if (status === 'on_leave' || loc === 'ลา') {
    return findShiftTypeByLocation('ลา', types)?.label ?? 'ลา';
  }

  const matched = findShiftTypeByLocation(loc, types);
  if (matched) return matched.label;

  if (loc === '6:30' || loc === '06:30') return '06:30';
  if (loc === '7:00' || loc === '07:00') return '07:00';
  if (loc === '8:00' || loc === '08:00') return '08:00';

  return loc || 'งาน';
}
