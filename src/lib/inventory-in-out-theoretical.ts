export type InOutLedgerRow = {
  type: 'IN' | 'OUT' | 'ADJUST' | 'ADD' | 'DELETE' | string;
  quantity: number;
  created_at: string;
  /** Set on ADJUST rows — absolute stock after manual correction (warehouse edit / ปรับจำนวน). */
  balance_after?: number | null;
};

function sortLedgerRows(rows: InOutLedgerRow[]): InOutLedgerRow[] {
  return [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function applyInOutDelta(stock: number, row: InOutLedgerRow): number {
  if (row.type === 'IN') return stock + (Number(row.quantity) || 0);
  if (row.type === 'OUT') return stock - (Number(row.quantity) || 0);
  return stock;
}

/**
 * Expected stock for count accuracy:
 * - Latest ADJUST (warehouse edit / ปรับจำนวน) rebaselines to balance_after immediately.
 * - Only IN/OUT after that ADJUST are replayed on top.
 * - Without ADJUST: ADD baseline (or 0) + all IN/OUT.
 * ADJUST itself does not affect accuracy % — only count verifications do.
 */
export function computeInOutTheoreticalStock(rows: InOutLedgerRow[]): number {
  const sorted = sortLedgerRows(rows);

  let lastAdjustIndex = -1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].type === 'ADJUST') lastAdjustIndex = i;
  }

  if (lastAdjustIndex >= 0) {
    const adjust = sorted[lastAdjustIndex];
    let stock = Number(adjust.balance_after);
    if (!Number.isFinite(stock)) {
      stock = 0;
    }

    for (let i = lastAdjustIndex + 1; i < sorted.length; i += 1) {
      stock = applyInOutDelta(stock, sorted[i]);
    }
    return stock;
  }

  let stock = 0;
  let baselineSet = false;

  for (const row of sorted) {
    if (row.type === 'ADD' && !baselineSet) {
      stock = Number(row.quantity) || 0;
      baselineSet = true;
      continue;
    }

    stock = applyInOutDelta(stock, row);
  }

  return stock;
}

export function computeAccuracyPct(matchChecks: number, totalChecks: number): number | null {
  if (totalChecks <= 0) return null;
  return Math.round((matchChecks / totalChecks) * 1000) / 10;
}
