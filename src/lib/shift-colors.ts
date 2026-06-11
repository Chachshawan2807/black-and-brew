/** Pastel shift colors — synced with schedule dropdown (ScheduleClient shiftTypes) */
const PASTEL = 'bb-pastel-surface text-[#000000]';

const SHIFT_TYPE_COLORS = {
  '6:30': `${PASTEL} bg-[#d4edda] border border-[#c3e6cb]`,
  '06:30': `${PASTEL} bg-[#d4edda] border border-[#c3e6cb]`,
  '7:00': `${PASTEL} bg-[#ffffff] border border-gray-300`,
  '07:00': `${PASTEL} bg-[#ffffff] border border-gray-300`,
  '8:00': `${PASTEL} bg-[#fff3cd] border border-[#ffeeba]`,
  '08:00': `${PASTEL} bg-[#fff3cd] border border-[#ffeeba]`,
  'ร้านซักผ้า': `${PASTEL} bg-[#d1ecf1] border border-[#bee5eb]`,
  'ไปสาขา 2': `${PASTEL} bg-[#d1ecf1] border border-[#bee5eb]`,
  'ลา': `${PASTEL} bg-[#f8d7da] border border-[#f5c6cb]`,
} as const;

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
  order: `${PASTEL} bg-[#d4edda] border border-[#c3e6cb]`,
  addItem: `${PASTEL} bg-[#fff3cd] border border-[#ffeeba]`,
  history: `${PASTEL} bg-[#d1ecf1] border border-[#bee5eb]`,
  toggleTrack: 'bg-card border border-border',
  inactive: 'text-muted-foreground bg-transparent hover:text-foreground',
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

export function getShiftColorClass(location: string, status?: string): string {
  const loc = location.replace(/^เข้ากะ\s*/, '').trim();

  if (status === 'on_leave' || loc === 'ลา') {
    return SHIFT_TYPE_COLORS['ลา'];
  }

  const direct = SHIFT_TYPE_COLORS[loc as keyof typeof SHIFT_TYPE_COLORS];
  if (direct) return direct;

  if (loc.includes('ซักผ้า') || loc.includes('สาขา')) {
    return SHIFT_TYPE_COLORS['ร้านซักผ้า'];
  }

  return loc ? SHIFT_TYPE_COLORS['ร้านซักผ้า'] : SHIFT_TYPE_COLORS['7:00'];
}

export function getShiftDisplayText(location: string, status?: string): string {
  const loc = location.replace(/^เข้ากะ\s*/, '').trim();

  if (status === 'on_leave' || loc === 'ลา') return 'ลา';
  if (loc === '6:30' || loc === '06:30') return '06:30';
  if (loc === '7:00' || loc === '07:00') return '07:00';
  if (loc === '8:00' || loc === '08:00') return '08:00';

  return loc || 'งาน';
}
