import { describe, expect, test } from 'vitest';
import {
  buildBranchWithdrawNote,
  filterBranchWithdrawSaveLines,
  formatBranchWithdrawLineMessage,
} from '@/lib/inventory-branch-withdraw-format';

describe('branch withdraw save payload', () => {
  test('filter keeps only rows with branch1 qty', () => {
    const rows = filterBranchWithdrawSaveLines([
      { itemId: 'a', name: 'A', qtyBranch1: '2', qtyBranch2: '', branch2Unit: '' },
      { itemId: 'b', name: 'B', qtyBranch1: '', qtyBranch2: '9', branch2Unit: 'ลัง' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemId).toBe('a');
  });

  test('server rebuilds same line message as client filter', () => {
    const rows = filterBranchWithdrawSaveLines([
      { itemId: 'a', name: 'ทิชชู่เล็ก', qtyBranch1: '24', qtyBranch2: '1', branch2Unit: 'ลัง' },
    ]);
    const message = formatBranchWithdrawLineMessage(rows, new Date(2026, 6, 11));
    expect(message).toContain('1. ทิชชู่เล็ก = 1 (ลัง)');
  });

  test('note embeds withdrawal id', () => {
    const id = '11111111-1111-1111-1111-111111111111';
    expect(buildBranchWithdrawNote(id)).toBe('[branch2-withdraw:11111111-1111-1111-1111-111111111111]');
  });
});
