import { subDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';
import { THAI_TIMEZONE } from '@/lib/timezone';

export const INVENTORY_TRANSACTION_DATE_MAX_LOOKBACK_DAYS = 90;
export const GAP_DISMISS_KEY_PREFIX = 'bb-inventory-inout-gap-dismissed:';

export type TransactionDatePromptContext = {
  backfillMode: boolean;
  hasYesterdayInOutGap: boolean;
  quickType: 'IN' | 'OUT' | 'ADJUST';
};

export function getBangkokTodayDateString(now = new Date()): string {
  return formatBangkokDate(now);
}

export function getBangkokYesterdayDateString(now = new Date()): string {
  const bkkNow = toZonedTime(now, THAI_TIMEZONE);
  return formatBangkokDate(subDays(bkkNow, 1));
}

function formatBangkokDate(date: Date): string {
  const bkk = toZonedTime(date, THAI_TIMEZONE);
  const y = bkk.getFullYear();
  const m = String(bkk.getMonth() + 1).padStart(2, '0');
  const d = String(bkk.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Selected calendar day in Bangkok + current Bangkok clock time → UTC ISO for DB `transaction_at`. */
export function bangkokDateStringToTransactionAt(dateStr: string, now = new Date()): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const bkkNow = toZonedTime(now, THAI_TIMEZONE);
  const bkkLocal = new Date(
    year,
    month - 1,
    day,
    bkkNow.getHours(),
    bkkNow.getMinutes(),
    bkkNow.getSeconds(),
    bkkNow.getMilliseconds(),
  );
  return fromZonedTime(bkkLocal, THAI_TIMEZONE).toISOString();
}

function isBangkokMidnight(date: Date): boolean {
  const bkk = toZonedTime(date, THAI_TIMEZONE);
  return (
    bkk.getHours() === 0 &&
    bkk.getMinutes() === 0 &&
    bkk.getSeconds() === 0 &&
    bkk.getMilliseconds() === 0
  );
}

/** History display: business date from `transaction_at`, actual clock from `created_at` for legacy midnight rows. */
export function resolveInventoryHistoryTimestamp(row: {
  transaction_at?: string | null;
  created_at: string;
}): Date {
  const createdAt = new Date(row.created_at);
  if (!row.transaction_at) return createdAt;

  const transactionAt = new Date(row.transaction_at);
  if (!isBangkokMidnight(transactionAt)) return transactionAt;

  const txBkk = toZonedTime(transactionAt, THAI_TIMEZONE);
  const createdBkk = toZonedTime(createdAt, THAI_TIMEZONE);
  const combined = new Date(
    txBkk.getFullYear(),
    txBkk.getMonth(),
    txBkk.getDate(),
    createdBkk.getHours(),
    createdBkk.getMinutes(),
    createdBkk.getSeconds(),
    createdBkk.getMilliseconds(),
  );
  return fromZonedTime(combined, THAI_TIMEZONE);
}

export function shouldPromptTransactionDate(context: TransactionDatePromptContext): boolean {
  if (context.quickType === 'ADJUST') return false;
  return context.backfillMode || context.hasYesterdayInOutGap;
}

export function getDefaultTransactionDateString(options: {
  backfillMode: boolean;
  hasYesterdayInOutGap: boolean;
  today: string;
  yesterday: string;
}): string {
  if (options.hasYesterdayInOutGap && !options.backfillMode) {
    return options.yesterday;
  }
  return options.today;
}

export function isValidTransactionDateString(
  dateStr: string,
  todayStr: string,
  maxLookbackDays = INVENTORY_TRANSACTION_DATE_MAX_LOOKBACK_DAYS,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  if (dateStr > todayStr) return false;

  const [y, m, d] = todayStr.split('-').map(Number);
  const todayBkk = new Date(y, m - 1, d);
  const minBkk = subDays(todayBkk, maxLookbackDays);
  const minStr = formatBangkokDate(minBkk);
  return dateStr >= minStr;
}

export function getGapDismissStorageKey(yesterdayDate: string): string {
  return `${GAP_DISMISS_KEY_PREFIX}${yesterdayDate}`;
}

export function getBangkokDayUtcBounds(dateStr: string): { startUtc: string; endUtc: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const bkkLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
  const bkkStart = startOfDay(bkkLocal);
  const bkkEnd = endOfDay(bkkLocal);
  return {
    startUtc: fromZonedTime(bkkStart, THAI_TIMEZONE).toISOString(),
    endUtc: fromZonedTime(bkkEnd, THAI_TIMEZONE).toISOString(),
  };
}
