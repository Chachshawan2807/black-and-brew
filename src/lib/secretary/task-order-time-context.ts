import { formatInTimeZone } from 'date-fns-tz';
import { THAI_TIMEZONE } from '@/lib/timezone';

export type SecretaryWorkdayPhase = 'before_open' | 'open_hours' | 'near_close';

/** Default Bangkok shop hours for task-order context (ICT). */
export const DEFAULT_SHOP_OPEN_MINUTES = 7 * 60 + 30; // 07:30
export const DEFAULT_SHOP_CLOSE_MINUTES = 20 * 60; // 20:00
export const NEAR_CLOSE_LEAD_MINUTES = 60;

export type SecretaryTimeContext = {
  nowIso: string;
  bangkokTime: string;
  phase: SecretaryWorkdayPhase;
};

export function resolveSecretaryWorkdayPhase(
  now: Date,
  openMinutes = DEFAULT_SHOP_OPEN_MINUTES,
  closeMinutes = DEFAULT_SHOP_CLOSE_MINUTES,
): SecretaryWorkdayPhase {
  const hhmm = formatInTimeZone(now, THAI_TIMEZONE, 'HH:mm');
  const [hour, minute] = hhmm.split(':').map(Number);
  const minutes = hour * 60 + minute;

  if (minutes < openMinutes) return 'before_open';
  if (minutes >= closeMinutes - NEAR_CLOSE_LEAD_MINUTES) return 'near_close';
  return 'open_hours';
}

export function buildSecretaryTimeContext(now = new Date()): SecretaryTimeContext {
  return {
    nowIso: now.toISOString(),
    bangkokTime: formatInTimeZone(now, THAI_TIMEZONE, 'yyyy-MM-dd HH:mm'),
    phase: resolveSecretaryWorkdayPhase(now),
  };
}

export const WORKDAY_PHASE_LABELS: Record<SecretaryWorkdayPhase, string> = {
  before_open: 'ก่อนเปิดร้าน',
  open_hours: 'เปิดร้านแล้ว',
  near_close: 'ใกล้ปิดร้าน',
};
