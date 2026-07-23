export const BRANCH_WITHDRAW_DRAFT_KEY = 'inventory-branch-withdraw-draft:v1';

export type BranchWithdrawDraftRow = {
  qtyBranch1: string;
  qtyBranch2: string;
  branch2Unit: string;
};

export type BranchWithdrawDraft = {
  rows: Record<string, BranchWithdrawDraftRow>;
  extraItemIds?: string[];
};

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDraftRow(value: unknown): value is BranchWithdrawDraftRow {
  if (!isRecord(value)) return false;
  return (
    typeof value.qtyBranch1 === 'string' &&
    typeof value.qtyBranch2 === 'string' &&
    typeof value.branch2Unit === 'string'
  );
}

export function serializeBranchWithdrawDraft(draft: BranchWithdrawDraft): string {
  return JSON.stringify(draft);
}

function isExtraItemIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string');
}

export function parseBranchWithdrawDraft(raw: string): BranchWithdrawDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.rows)) return null;
    for (const row of Object.values(parsed.rows)) {
      if (!isDraftRow(row)) return null;
    }
    if (parsed.extraItemIds !== undefined && !isExtraItemIds(parsed.extraItemIds)) {
      return null;
    }
    return {
      rows: parsed.rows as Record<string, BranchWithdrawDraftRow>,
      extraItemIds: parsed.extraItemIds as string[] | undefined,
    };
  } catch {
    return null;
  }
}

export function readBranchWithdrawDraft(storage: DraftStorage): BranchWithdrawDraft | null {
  const raw = storage.getItem(BRANCH_WITHDRAW_DRAFT_KEY);
  if (!raw) return null;
  return parseBranchWithdrawDraft(raw);
}

export function writeBranchWithdrawDraft(storage: DraftStorage, draft: BranchWithdrawDraft): void {
  storage.setItem(BRANCH_WITHDRAW_DRAFT_KEY, serializeBranchWithdrawDraft(draft));
}

export function clearBranchWithdrawDraft(storage: DraftStorage): void {
  storage.removeItem(BRANCH_WITHDRAW_DRAFT_KEY);
}

export function emptyDraftRow(): BranchWithdrawDraftRow {
  return { qtyBranch1: '', qtyBranch2: '', branch2Unit: '' };
}

export type BranchWithdrawDraftLine = {
  itemId: string;
  name: string;
  qtyBranch1: string;
  qtyBranch2: string;
  branch2Unit: string;
};

/** Map visible items + draft rows into save/preview line payloads. */
export function buildBranchWithdrawDraftLines(
  displayItems: ReadonlyArray<{ id: string; name: string }>,
  rows: Record<string, BranchWithdrawDraftRow>,
): BranchWithdrawDraftLine[] {
  const lines: BranchWithdrawDraftLine[] = [];
  for (const item of displayItems) {
    const draft = rows[item.id] ?? emptyDraftRow();
    lines.push({
      itemId: item.id,
      name: item.name,
      qtyBranch1: draft.qtyBranch1,
      qtyBranch2: draft.qtyBranch2,
      branch2Unit: draft.branch2Unit,
    });
  }
  return lines;
}

/**
 * Sync draft rows when the displayed item id set changes.
 * Returns the same reference when ids are unchanged (avoids needless re-renders).
 */
export function mergeRowsWithDisplayItemIds(
  itemIds: readonly string[],
  prev: Record<string, BranchWithdrawDraftRow>,
): Record<string, BranchWithdrawDraftRow> {
  const prevKeys = Object.keys(prev);
  if (itemIds.length === prevKeys.length) {
    let allMatch = true;
    for (const id of itemIds) {
      if (!(id in prev)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) return prev;
  }

  const rows: Record<string, BranchWithdrawDraftRow> = {};
  for (const id of itemIds) {
    rows[id] = prev[id] ?? emptyDraftRow();
  }
  return rows;
}
