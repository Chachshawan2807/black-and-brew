import { describe, expect, test } from 'vitest';
import {
  BRANCH_WITHDRAW_DRAFT_KEY,
  buildBranchWithdrawDraftLines,
  clearBranchWithdrawDraft,
  emptyDraftRow,
  mergeRowsWithDisplayItemIds,
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

  test('round-trips draft rows with extra item ids', () => {
    const draft: BranchWithdrawDraft = {
      rows: {
        'item-1': { qtyBranch1: '3', qtyBranch2: '', branch2Unit: '' },
        'item-2': { qtyBranch1: '24', qtyBranch2: '1', branch2Unit: 'ลัง' },
      },
      extraItemIds: ['item-3', 'item-4'],
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

  test('buildBranchWithdrawDraftLines maps display items to draft payloads', () => {
    const lines = buildBranchWithdrawDraftLines(
      [{ id: 'a', name: 'นม' }, { id: 'b', name: 'ชา' }],
      { a: { qtyBranch1: '2', qtyBranch2: '', branch2Unit: '' } },
    );
    expect(lines).toEqual([
      { itemId: 'a', name: 'นม', qtyBranch1: '2', qtyBranch2: '', branch2Unit: '' },
      { itemId: 'b', name: 'ชา', qtyBranch1: '', qtyBranch2: '', branch2Unit: '' },
    ]);
  });

  test('mergeRowsWithDisplayItemIds preserves reference when ids unchanged', () => {
    const prev = {
      a: { qtyBranch1: '1', qtyBranch2: '', branch2Unit: '' },
      b: { qtyBranch1: '', qtyBranch2: '2', branch2Unit: 'ลัง' },
    };
    const merged = mergeRowsWithDisplayItemIds(['a', 'b'], prev);
    expect(merged).toBe(prev);
  });

  test('mergeRowsWithDisplayItemIds adds new ids and drops removed ones', () => {
    const prev = {
      a: { qtyBranch1: '1', qtyBranch2: '', branch2Unit: '' },
    };
    const merged = mergeRowsWithDisplayItemIds(['a', 'c'], prev);
    expect(merged).toEqual({
      a: { qtyBranch1: '1', qtyBranch2: '', branch2Unit: '' },
      c: emptyDraftRow(),
    });
    expect(merged).not.toBe(prev);
  });
});
