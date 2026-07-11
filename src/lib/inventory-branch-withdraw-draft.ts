export const BRANCH_WITHDRAW_DRAFT_KEY = 'inventory-branch-withdraw-draft:v1';

export type BranchWithdrawDraftRow = {
  qtyBranch1: string;
  qtyBranch2: string;
  branch2Unit: string;
};

export type BranchWithdrawDraft = {
  rows: Record<string, BranchWithdrawDraftRow>;
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

export function parseBranchWithdrawDraft(raw: string): BranchWithdrawDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.rows)) return null;
    for (const row of Object.values(parsed.rows)) {
      if (!isDraftRow(row)) return null;
    }
    return { rows: parsed.rows as Record<string, BranchWithdrawDraftRow> };
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
