/** Pastel shift colors lookups use shift-type-config when available (client) */
import {
  DEFAULT_SHIFT_TYPES,
  buildShiftDisplay,
  findShiftTypeByLocation,
  getClientShiftTypes,
  type ShiftTypeEntry,
} from '@/lib/shift-type-config';
import {
  BB_PASTEL_BORDER_COLOR,
  BB_PASTEL_SURFACE,
  bbPastelClass,
} from '@/lib/ui-outlined-tokens';

/** Compact notification palettes hex pairs aligned with Tailwind classes below */
export type ShiftFlexPalette = { backgroundColor: string; borderColor: string };

const LEGACY_FLEX_PALETTES = {
  '6:30': { backgroundColor: '#d4edda', borderColor: BB_PASTEL_BORDER_COLOR },
  '06:30': { backgroundColor: '#d4edda', borderColor: BB_PASTEL_BORDER_COLOR },
  '7:00': { backgroundColor: '#ffffff', borderColor: BB_PASTEL_BORDER_COLOR },
  '07:00': { backgroundColor: '#ffffff', borderColor: BB_PASTEL_BORDER_COLOR },
  '8:00': { backgroundColor: '#fff3cd', borderColor: BB_PASTEL_BORDER_COLOR },
  '08:00': { backgroundColor: '#fff3cd', borderColor: BB_PASTEL_BORDER_COLOR },
  'ร้านซักผ้า': { backgroundColor: '#d1ecf1', borderColor: BB_PASTEL_BORDER_COLOR },
  'ไปสาขา 2': { backgroundColor: '#d1ecf1', borderColor: BB_PASTEL_BORDER_COLOR },
  'ลา': { backgroundColor: '#f8d7da', borderColor: BB_PASTEL_BORDER_COLOR },
  'วันหยุด': { backgroundColor: '#f8d7da', borderColor: BB_PASTEL_BORDER_COLOR },
} as const satisfies Record<string, ShiftFlexPalette>;

export const FLEX_HEADER_PALETTE: ShiftFlexPalette = {
  backgroundColor: '#f7f5e8',
  borderColor: BB_PASTEL_BORDER_COLOR,
};

export const FLEX_HOLIDAY_PALETTE: ShiftFlexPalette = {
  backgroundColor: '#fff3cd',
  borderColor: BB_PASTEL_BORDER_COLOR,
};

export const FLEX_MUTED_TEXT = '#6b7280';
export const FLEX_BODY_TEXT = '#111111';

const PASTEL = BB_PASTEL_SURFACE;

export const DASHBOARD_STAT_COLORS = {
  work: bbPastelClass('bg-[#d4edda]'),
  leave: bbPastelClass('bg-[#f8d7da]'),
  holiday: bbPastelClass('bg-[#fff3cd]'),
} as const;

/** Inventory Quick Action same muted pastels as schedule/dashboard, black text */
export const INVENTORY_QUICK_ACTION_COLORS = {
  in: bbPastelClass('bg-[#d4edda]'),
  out: bbPastelClass('bg-[#f8d7da]'),
  adjust: bbPastelClass('bg-[#fff3cd]'),
  /** สั่งซื้อ cyan (procurement / branch duty palette) */
  order: bbPastelClass('bg-[#d1ecf1]'),
  /** เพิ่มสินค้า green (create / receive) */
  addItem: bbPastelClass('bg-[#d4edda]'),
  /** ประวัติ warm cream (neutral records) */
  history: bbPastelClass('bg-[#f7f5e8]'),
  /** ปรับสต็อกด่วน FAB yellow (adjust / quick stock) */
  fab: bbPastelClass('bg-[#fff3cd]'),
  toggleTrack: 'bg-muted/80 border border-border',
  inactive: 'text-muted-foreground hover:text-foreground',
} as const;

export const INVENTORY_QUICK_ACTION_HOVER = {
  order: 'hover:bg-[#bee5eb]/70',
  addItem: 'hover:bg-[#c3e6cb]/70',
  history: 'hover:bg-[#e3dfd0]/70',
  fab: 'hover:brightness-95',
} as const;

export type InventoryQuickActionType = 'IN' | 'OUT' | 'ADJUST';

/** Pastel surface for IN / OUT / ADJUST matches quick-action type toggle when selected */
export function inventoryQuickActionTypeColors(type: InventoryQuickActionType): string {
  switch (type) {
    case 'OUT':
      return INVENTORY_QUICK_ACTION_COLORS.out;
    case 'ADJUST':
      return INVENTORY_QUICK_ACTION_COLORS.adjust;
    default:
      return INVENTORY_QUICK_ACTION_COLORS.in;
  }
}

/** วันหยุด โทนเดียวกับกะลา */
export const DAY_OFF_COLOR = bbPastelClass('bg-[#f8d7da]');

/** Morning Latte Cream primary surface (`--background`, design.md `--bg-primary`) */
export const MORNING_LATTE_CREAM = 'bg-card border border-border';

/** Sales dashboard pastel section accents aligned with schedule/inventory palette */
/** Bean order status badges (payment / delivery) */
export const BEAN_ORDER_BADGE_COLORS = {
  payment: 'bg-[#e8f5e9]',
  delivery: 'bg-[#e3f2fd]',
} as const;

/** Secretary task board card surfaces */
export const SECRETARY_TASK_COLORS = {
  card: 'bg-card border-foreground/20',
  done: bbPastelClass('bg-[#d4f5d4]'),
  doneAction: bbPastelClass('bg-[#eef9ee]'),
  attention: bbPastelClass('bg-[#fde8e8]'),
} as const;

export const SALES_SECTION_COLORS = {
  headerIcon: bbPastelClass('bg-[#d4edda]'),
  upload: MORNING_LATTE_CREAM,
  revenue: bbPastelClass('bg-[#d4edda]'),
  quantity: bbPastelClass('bg-[#fff3cd]'),
  menuItems: bbPastelClass('bg-[#f8d7da]'),
  categories: MORNING_LATTE_CREAM,
  chart: MORNING_LATTE_CREAM,
  topProducts: MORNING_LATTE_CREAM,
  table: 'bg-card border border-border',
  empty: bbPastelClass('bg-[#fff3cd]'),
} as const;

export const SALES_CATEGORY_CARD_COLORS = [
  bbPastelClass('bg-[#d4edda]'),
  bbPastelClass('bg-[#d1ecf1]'),
  bbPastelClass('bg-[#fff3cd]'),
  bbPastelClass('bg-[#f8d7da]'),
  bbPastelClass('bg-[#e6f0ff]'),
  bbPastelClass('bg-[#f3e8ff]'),
] as const;

export { PASTEL as PASTEL_SURFACE };

function resolveTypes(): ShiftTypeEntry[] {
  if (typeof window !== 'undefined') {
    return getClientShiftTypes();
  }
  return DEFAULT_SHIFT_TYPES;
}

function entryToFlexPalette(entry: ShiftTypeEntry): ShiftFlexPalette {
  return { backgroundColor: entry.bgColor, borderColor: BB_PASTEL_BORDER_COLOR };
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
    return bbPastelClass('bg-[#f8d7da]');
  }

  const matched = findShiftTypeByLocation(loc, types);
  if (matched) return buildShiftDisplay(matched).className;

  if (!loc) return bbPastelClass('bg-[#ffffff]');

  return bbPastelClass('bg-[#d1ecf1]');
}

export type ShiftColorStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

const FALLBACK_SHIFT_STYLE: ShiftColorStyle = {
  backgroundColor: '#d1ecf1',
  borderColor: BB_PASTEL_BORDER_COLOR,
  color: '#000000',
};

/** Inline pastel colors same source as schedule table cells (buildShiftDisplay) */
export function getShiftColorStyle(location: string, status?: string): ShiftColorStyle {
  const loc = location.replace(/^เข้ากะ\s*/, '').trim();
  const types = resolveTypes();

  if (status === 'on_leave' || loc === 'ลา') {
    const leave = findShiftTypeByLocation('ลา', types);
    if (leave) return buildShiftDisplay(leave).style;
    return { backgroundColor: '#f8d7da', borderColor: BB_PASTEL_BORDER_COLOR, color: '#000000' };
  }

  const matched = findShiftTypeByLocation(loc, types);
  if (matched) return buildShiftDisplay(matched).style;

  if (!loc) {
    return { backgroundColor: '#ffffff', borderColor: BB_PASTEL_BORDER_COLOR, color: '#000000' };
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
