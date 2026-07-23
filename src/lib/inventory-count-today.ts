import { endOfDay, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { formatToThai, isSameThaiDay } from '@/lib/date-utils';
import { THAI_TIMEZONE } from '@/lib/timezone';

export type ItemTodayCountRecord = {
  countedAt: string;
  countedQty: number;
  systemStockQty: number | null;
};

export type TodayCountSessionStatus = {
  perItem: Record<string, ItemTodayCountRecord>;
  session: {
    totalItems: number;
    countedTodayCount: number;
    firstCountedAt: string | null;
    lastCountedAt: string | null;
    hasCountedToday: boolean;
    isFullyCountedToday: boolean;
  };
};

export type CountLogRow = {
  entity_id: string | null;
  occurred_at: string;
  field_changes: unknown;
};

export function getBangkokTodayUtcBounds(now = new Date()): { startUtc: string; endUtc: string } {
  const bkkNow = toZonedTime(now, THAI_TIMEZONE);
  return {
    startUtc: fromZonedTime(startOfDay(bkkNow), THAI_TIMEZONE).toISOString(),
    endUtc: fromZonedTime(endOfDay(bkkNow), THAI_TIMEZONE).toISOString(),
  };
}

function parseFieldChanges(
  fieldChanges: unknown,
): Array<{ field: string; old_value: unknown; new_value: unknown }> {
  if (!Array.isArray(fieldChanges)) return [];
  return fieldChanges.filter(
    (entry): entry is { field: string; old_value: unknown; new_value: unknown } =>
      typeof entry === 'object' &&
      entry !== null &&
      'field' in entry &&
      typeof (entry as { field: unknown }).field === 'string',
  );
}

export function extractStockQtyFromCountLog(row: CountLogRow): {
  countedQty: number | null;
  systemStockQty: number | null;
} {
  const changes = parseFieldChanges(row.field_changes);
  const stockChange = changes.find((change) => change.field === 'stock');
  if (!stockChange) {
    return { countedQty: null, systemStockQty: null };
  }

  const countedQty =
    stockChange.new_value === null || stockChange.new_value === undefined
      ? null
      : Number(stockChange.new_value);
  const systemStockQty =
    stockChange.old_value === null || stockChange.old_value === undefined
      ? null
      : Number(stockChange.old_value);

  return {
    countedQty: countedQty === null || Number.isNaN(countedQty) ? null : countedQty,
    systemStockQty:
      systemStockQty === null || Number.isNaN(systemStockQty) ? null : systemStockQty,
  };
}

export function buildTodayCountStatusFromLogs(
  rows: CountLogRow[],
  totalItems: number,
  now = new Date(),
): TodayCountSessionStatus {
  const perItem: Record<string, ItemTodayCountRecord> = {};
  let firstCountedAt: string | null = null;
  let lastCountedAt: string | null = null;

  for (const row of rows) {
    const itemId = row.entity_id;
    if (!itemId || perItem[itemId]) continue;
    if (!isSameThaiDay(row.occurred_at, now)) continue;

    const { countedQty, systemStockQty } = extractStockQtyFromCountLog(row);
    if (countedQty === null) continue;

    perItem[itemId] = {
      countedAt: row.occurred_at,
      countedQty,
      systemStockQty,
    };

    if (!firstCountedAt || row.occurred_at < firstCountedAt) {
      firstCountedAt = row.occurred_at;
    }
    if (!lastCountedAt || row.occurred_at > lastCountedAt) {
      lastCountedAt = row.occurred_at;
    }
  }

  const countedTodayCount = Object.keys(perItem).length;

  return {
    perItem,
    session: {
      totalItems,
      countedTodayCount,
      firstCountedAt,
      lastCountedAt,
      hasCountedToday: countedTodayCount > 0,
      isFullyCountedToday: totalItems > 0 && countedTodayCount >= totalItems,
    },
  };
}

export function formatInventoryCountTime(iso: string): string {
  return formatToThai(iso, 'HH:mm น.');
}

export function applyItemTodayCount(
  current: TodayCountSessionStatus,
  itemId: string,
  countedQty: number,
  systemStockQty: number | null,
  countedAt = new Date().toISOString(),
): TodayCountSessionStatus {
  const perItem = {
    ...current.perItem,
    [itemId]: {
      countedAt,
      countedQty,
      systemStockQty,
    },
  };

  const countedTodayCount = Object.keys(perItem).length;
  const firstCountedAt =
    !current.session.firstCountedAt || countedAt < current.session.firstCountedAt
      ? countedAt
      : current.session.firstCountedAt;
  const lastCountedAt =
    !current.session.lastCountedAt || countedAt > current.session.lastCountedAt
      ? countedAt
      : current.session.lastCountedAt;

  return {
    perItem,
    session: {
      ...current.session,
      countedTodayCount,
      firstCountedAt,
      lastCountedAt,
      hasCountedToday: countedTodayCount > 0,
      isFullyCountedToday:
        current.session.totalItems > 0 &&
        countedTodayCount >= current.session.totalItems,
    },
  };
}

export function removeItemTodayCount(
  current: TodayCountSessionStatus,
  itemId: string,
): TodayCountSessionStatus {
  if (!current.perItem[itemId]) return current;

  const perItem = { ...current.perItem };
  delete perItem[itemId];

  const remaining = Object.values(perItem);
  const firstCountedAt =
    remaining.length > 0
      ? remaining.reduce((min, row) => (row.countedAt < min ? row.countedAt : min), remaining[0].countedAt)
      : null;
  const lastCountedAt =
    remaining.length > 0
      ? remaining.reduce((max, row) => (row.countedAt > max ? row.countedAt : max), remaining[0].countedAt)
      : null;

  const countedTodayCount = remaining.length;

  return {
    perItem,
    session: {
      ...current.session,
      countedTodayCount,
      firstCountedAt,
      lastCountedAt,
      hasCountedToday: countedTodayCount > 0,
      isFullyCountedToday:
        current.session.totalItems > 0 &&
        countedTodayCount >= current.session.totalItems,
    },
  };
}
