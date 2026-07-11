import { describe, expect, test } from 'vitest';
import {
  BRANCH_WITHDRAW_DRAFT_KEY,
  clearBranchWithdrawDraft,
  emptyDraftRow,
  parseBranchWithdrawDraft,
  readBranchWithdrawDraft,
  serializeBranchWithdrawDraft,
  writeBranchWithdrawDraft,
  type BranchWithdrawDraft,
} from '@/lib/inventory-branch-withdraw-draft';

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    store,
  };
}

describe('branch withdraw draft', () => {
  test('exports stable storage key', () => {
    expect(BRANCH_WITHDRAW_DRAFT_KEY).toBe('inventory-branch-withdraw-draft:v1');
  });

  test('round-trips draft rows', () => {
    const draft: BranchWithdrawDraft = {
      rows: {
        'item-1': { qtyBranch1: '3', qtyBranch2: '', branch2Unit: '' },
        'item-2': { qtyBranch1: '24', qtyBranch2: '1', branch2Unit: 'ลัง' },
      },
    };
    const parsed = parseBranchWithdrawDraft(serializeBranchWithdrawDraft(draft));
    expect(parsed).toEqual(draft);
  });

  test('rejects invalid payload', () => {
    expect(parseBranchWithdrawDraft('not-json')).toBeNull();
    expect(parseBranchWithdrawDraft('{}')).toBeNull();
    expect(parseBranchWithdrawDraft(JSON.stringify({ rows: { a: { qtyBranch1: 3 } } }))).toBeNull();
  });

  test('emptyDraftRow returns blank strings', () => {
    expect(emptyDraftRow()).toEqual({
      qtyBranch1: '',
      qtyBranch2: '',
      branch2Unit: '',
    });
  });

  test('read/write/clear uses sessionStorage key', () => {
    const storage = createMockStorage();
    const draft: BranchWithdrawDraft = {
      rows: {
        'item-1': { qtyBranch1: '2', qtyBranch2: '', branch2Unit: '' },
      },
    };

    writeBranchWithdrawDraft(storage, draft);
    expect(storage.store.get(BRANCH_WITHDRAW_DRAFT_KEY)).toBeTruthy();
    expect(readBranchWithdrawDraft(storage)).toEqual(draft);

    clearBranchWithdrawDraft(storage);
    expect(readBranchWithdrawDraft(storage)).toBeNull();
  });
});
