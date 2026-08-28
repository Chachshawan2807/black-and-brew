import { describe, expect, test } from 'vitest';
import { detectBranch2Day, isBranch2Shift } from '@/lib/secretary/detect-branch2-day';

describe('detectBranch2Day', () => {
  test('returns true for ไปสาขา 2 shift', () => {
    expect(
      isBranch2Shift({ metadata: { location: 'ไปสาขา 2', remark: 'คั่วกาแฟ', is_management: true } }),
    ).toBe(true);
  });

  test('detects branch2 remark', () => {
    const result = detectBranch2Day([
      { metadata: { location: '8:00' } },
      { metadata: { location: 'ไปสาขา 2', remark: 'คั่วกาแฟ', is_management: true } },
    ]);
    expect(result.isBranch2Day).toBe(true);
    expect(result.branch2Remark).toBe('คั่วกาแฟ');
  });

  test('returns false when no branch2 shift', () => {
    expect(detectBranch2Day([{ metadata: { location: '8:00' } }]).isBranch2Day).toBe(false);
  });
});
