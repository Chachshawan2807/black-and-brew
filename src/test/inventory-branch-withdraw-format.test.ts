import { describe, expect, test } from 'vitest';
import {
  BRANCH_WITHDRAW_NOTE_PREFIX,
  buildBranchWithdrawNote,
  formatBranchWithdrawHeaderDate,
  formatBranchWithdrawLineMessage,
  type BranchWithdrawFormatLine,
} from '@/lib/inventory-branch-withdraw-format';

describe('formatBranchWithdrawHeaderDate', () => {
  test('formats D/M/YY Buddhist era', () => {
    expect(formatBranchWithdrawHeaderDate(new Date(2026, 6, 11))).toBe('11/7/69');
  });
});

describe('formatBranchWithdrawLineMessage', () => {
  const baseDate = new Date(2026, 6, 11);

  test('skips rows without branch1 qty and renumbers', () => {
    const lines: BranchWithdrawFormatLine[] = [
      { name: 'นมอัลมอนต์', qtyBranch1: 3, qtyBranch2: null, branch2Unit: null },
      { name: 'ว่าง', qtyBranch1: 0, qtyBranch2: null, branch2Unit: null },
      { name: 'คาราเมล', qtyBranch1: 1, qtyBranch2: null, branch2Unit: null },
    ];
    const text = formatBranchWithdrawLineMessage(lines, baseDate);
    expect(text).toBe(
      'สาขา 1 เบิกของ 11/7/69\n\n1. นมอัลมอนต์ = 3\n2. คาราเมล = 1',
    );
  });

  test('uses branch2 qty in LINE when provided', () => {
    const lines: BranchWithdrawFormatLine[] = [
      { name: 'ทิชชู่เล็ก', qtyBranch1: 24, qtyBranch2: 1, branch2Unit: 'ลัง' },
    ];
    const text = formatBranchWithdrawLineMessage(lines, baseDate);
    expect(text).toContain('1. ทิชชู่เล็ก = 1 (ลัง)');
  });

  test('omits unit suffix when branch2 unit empty', () => {
    const lines: BranchWithdrawFormatLine[] = [
      { name: 'นมอัลมอนต์', qtyBranch1: 3, qtyBranch2: 3, branch2Unit: null },
    ];
    const text = formatBranchWithdrawLineMessage(lines, baseDate);
    expect(text).toContain('1. นมอัลมอนต์ = 3');
    expect(text).not.toContain('(');
  });
});

describe('branch withdraw note', () => {
  test('builds stable note prefix', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(buildBranchWithdrawNote(id)).toBe(`${BRANCH_WITHDRAW_NOTE_PREFIX}${id}]`);
    expect(BRANCH_WITHDRAW_NOTE_PREFIX).toBe('[branch2-withdraw:');
  });
});
