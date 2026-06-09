/** Pastel shift colors — synced with schedule dropdown (ScheduleClient shiftTypes) */
const SHIFT_TYPE_COLORS = {
  '6:30': 'bg-[#d4edda] text-[#000000] border border-[#c3e6cb]',
  '06:30': 'bg-[#d4edda] text-[#000000] border border-[#c3e6cb]',
  '7:00': 'bg-[#ffffff] text-[#000000] border border-gray-300',
  '07:00': 'bg-[#ffffff] text-[#000000] border border-gray-300',
  '8:00': 'bg-[#fff3cd] text-[#000000] border border-[#ffeeba]',
  '08:00': 'bg-[#fff3cd] text-[#000000] border border-[#ffeeba]',
  'ร้านซักผ้า': 'bg-[#d1ecf1] text-[#000000] border border-[#bee5eb]',
  'ไปสาขา 2': 'bg-[#d1ecf1] text-[#000000] border border-[#bee5eb]',
  'ลา': 'bg-[#f8d7da] text-[#000000] border border-[#f5c6cb]',
} as const;

export const DASHBOARD_STAT_COLORS = {
  work: 'bg-[#d4edda] border border-[#c3e6cb]',
  leave: 'bg-[#f8d7da] border border-[#f5c6cb]',
  holiday: 'bg-[#fff3cd] border border-[#ffeeba]',
} as const;

/** วันหยุด — โทนเดียวกับกะลา */
export const DAY_OFF_COLOR = 'bg-[#f8d7da] text-[#000000] border border-[#f5c6cb]';

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
