/**
 * Count accuracy compares the physical count against system stock in inventory_items
 * at verification time. Manual overrides on the main inventory page do not create
 * verification rows — only entries from the stock-taking count page do.
 */
export function isCountMatch(countedQty: number, systemStockQty: number): boolean {
  return countedQty === systemStockQty;
}

export function computeCountDiscrepancy(countedQty: number, systemStockQty: number): number {
  return Math.abs(Number(countedQty) - Number(systemStockQty));
}

export function computeCountAccuracyPct(countedQty: number, systemStockQty: number): number {
  const discrepancy = computeCountDiscrepancy(countedQty, systemStockQty);
  const denominator = Math.max(Number(countedQty) || 0, Number(systemStockQty) || 0, 1);
  return Math.max(0, Math.round((1 - discrepancy / denominator) * 1000) / 10);
}

export function computeAggregateCountAccuracyPct(
  totalDiscrepancyQty: number,
  totalComparedQty: number,
): number | null {
  if (totalComparedQty <= 0) return null;
  return Math.max(0, Math.round((1 - totalDiscrepancyQty / totalComparedQty) * 1000) / 10);
}

export type CountAccuracyItemStats = {
  itemName?: string;
  totalChecks: number;
  matchChecks: number;
  accuracyPct: number | null;
  totalDiscrepancyQty: number;
  totalComparedQty: number;
  lastSystemStockQty: number | null;
  lastCountedQty: number | null;
  lastCountedAt: string | null;
  lastMatched: boolean | null;
};

export type CountAccuracyStatsSnapshot = {
  perItem: Record<string, CountAccuracyItemStats>;
  overall: {
    totalChecks: number;
    matchChecks: number;
    accuracyPct: number | null;
    totalDiscrepancyQty: number;
    totalComparedQty: number;
  };
};

export type CountVerificationDelta = {
  itemId: string;
  itemName?: string;
  countedQty: number;
  systemStockQty: number;
  matched: boolean;
  countedAt?: string;
};

const EMPTY_OVERALL: CountAccuracyStatsSnapshot['overall'] = {
  totalChecks: 0,
  matchChecks: 0,
  accuracyPct: null,
  totalDiscrepancyQty: 0,
  totalComparedQty: 0,
};

function emptySnapshot(): CountAccuracyStatsSnapshot {
  return { perItem: {}, overall: { ...EMPTY_OVERALL } };
}

function rebuildOverall(
  perItem: Record<string, CountAccuracyItemStats>,
): CountAccuracyStatsSnapshot['overall'] {
  let totalChecks = 0;
  let matchChecks = 0;
  let totalDiscrepancyQty = 0;
  let totalComparedQty = 0;

  for (const stats of Object.values(perItem)) {
    totalChecks += stats.totalChecks;
    matchChecks += stats.matchChecks;
    totalDiscrepancyQty += stats.totalDiscrepancyQty;
    totalComparedQty += stats.totalComparedQty;
  }

  return {
    totalChecks,
    matchChecks,
    totalDiscrepancyQty,
    totalComparedQty,
    accuracyPct: computeAggregateCountAccuracyPct(totalDiscrepancyQty, totalComparedQty),
  };
}

/** Incrementally apply one verification so the count UI need not refetch all rows. */
export function applyCountVerificationToAccuracyStats(
  current: CountAccuracyStatsSnapshot | null | undefined,
  delta: CountVerificationDelta,
): CountAccuracyStatsSnapshot {
  const base = current ?? emptySnapshot();
  const discrepancyQty = computeCountDiscrepancy(delta.countedQty, delta.systemStockQty);
  const comparedQty = Math.max(delta.countedQty, delta.systemStockQty, 1);
  const existing = base.perItem[delta.itemId];
  const nextItem: CountAccuracyItemStats = {
    itemName: delta.itemName ?? existing?.itemName ?? 'ไม่ทราบชื่อสินค้า',
    totalChecks: (existing?.totalChecks ?? 0) + 1,
    matchChecks: (existing?.matchChecks ?? 0) + (delta.matched ? 1 : 0),
    totalDiscrepancyQty: (existing?.totalDiscrepancyQty ?? 0) + discrepancyQty,
    totalComparedQty: (existing?.totalComparedQty ?? 0) + comparedQty,
    lastSystemStockQty: delta.systemStockQty,
    lastCountedQty: delta.countedQty,
    lastCountedAt: delta.countedAt ?? new Date().toISOString(),
    lastMatched: delta.matched,
    accuracyPct: null,
  };
  nextItem.accuracyPct = computeAggregateCountAccuracyPct(
    nextItem.totalDiscrepancyQty,
    nextItem.totalComparedQty,
  );

  const perItem = { ...base.perItem, [delta.itemId]: nextItem };
  return { perItem, overall: rebuildOverall(perItem) };
}

/** Reverse one verification (undo) without refetching the full ledger. */
export function removeCountVerificationFromAccuracyStats(
  current: CountAccuracyStatsSnapshot | null | undefined,
  delta: Omit<CountVerificationDelta, 'itemName' | 'countedAt'>,
): CountAccuracyStatsSnapshot {
  if (!current?.perItem[delta.itemId]) {
    return current ?? emptySnapshot();
  }

  const existing = current.perItem[delta.itemId];
  const discrepancyQty = computeCountDiscrepancy(delta.countedQty, delta.systemStockQty);
  const comparedQty = Math.max(delta.countedQty, delta.systemStockQty, 1);
  const nextChecks = Math.max(0, existing.totalChecks - 1);
  const perItem = { ...current.perItem };

  if (nextChecks <= 0) {
    delete perItem[delta.itemId];
  } else {
    const nextItem: CountAccuracyItemStats = {
      ...existing,
      totalChecks: nextChecks,
      matchChecks: Math.max(0, existing.matchChecks - (delta.matched ? 1 : 0)),
      totalDiscrepancyQty: Math.max(0, existing.totalDiscrepancyQty - discrepancyQty),
      totalComparedQty: Math.max(0, existing.totalComparedQty - comparedQty),
      lastSystemStockQty: null,
      lastCountedQty: null,
      lastCountedAt: null,
      lastMatched: null,
      accuracyPct: null,
    };
    nextItem.accuracyPct = computeAggregateCountAccuracyPct(
      nextItem.totalDiscrepancyQty,
      nextItem.totalComparedQty,
    );
    perItem[delta.itemId] = nextItem;
  }

  return { perItem, overall: rebuildOverall(perItem) };
}

/**
 * Merge a server accuracy snapshot with in-session local updates.
 * Prefer whichever side has more checks per item so a stale fetch cannot
 * wipe a just-recorded count, while a complete fetch still wins over a
 * thin local-only base.
 */
export function mergeAccuracyStatsPreferringHigherChecks(
  server: CountAccuracyStatsSnapshot | null | undefined,
  local: CountAccuracyStatsSnapshot | null | undefined,
): CountAccuracyStatsSnapshot {
  if (!server && !local) return emptySnapshot();
  if (!server) return local ?? emptySnapshot();
  if (!local) return server;

  const itemIds = new Set([
    ...Object.keys(server.perItem),
    ...Object.keys(local.perItem),
  ]);
  const perItem: Record<string, CountAccuracyItemStats> = {};

  for (const itemId of itemIds) {
    const serverStats = server.perItem[itemId];
    const localStats = local.perItem[itemId];
    if (!serverStats) {
      perItem[itemId] = localStats!;
      continue;
    }
    if (!localStats) {
      perItem[itemId] = serverStats;
      continue;
    }
    perItem[itemId] =
      localStats.totalChecks > serverStats.totalChecks ? localStats : serverStats;
  }

  return { perItem, overall: rebuildOverall(perItem) };
}
