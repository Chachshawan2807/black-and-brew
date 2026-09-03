import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const branchWithdrawClient = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
  'utf-8',
);

describe('branch withdraw withdrawal history', () => {
  test('shows only the latest three entries until user expands', () => {
    expect(branchWithdrawClient).toContain('BRANCH_WITHDRAW_HISTORY_INITIAL_COUNT = 3');
    expect(branchWithdrawClient).toContain('historyExpanded');
    expect(branchWithdrawClient).toContain('.slice(0, BRANCH_WITHDRAW_HISTORY_INITIAL_COUNT)');
    expect(branchWithdrawClient).toContain('ดูเพิ่มเติม');
    expect(branchWithdrawClient).toContain('setHistoryExpanded(true)');
  });
});

describe('branch withdraw dialogs', () => {
  test('all modal dialogs center with m-auto and respect mobile viewport height', () => {
    expect(branchWithdrawClient).toMatch(/const BRANCH_WITHDRAW_DIALOG_BASE_CLASS[\s\S]*m-auto max-h-\[min\(85dvh,100%\)\]/);
    expect(branchWithdrawClient).toMatch(/ref=\{historyLineDialogRef\} className=\{BRANCH_WITHDRAW_DIALOG_HISTORY_CLASS\}/);
    expect(branchWithdrawClient).not.toMatch(/detailDialogRef/);
    expect(branchWithdrawClient).toMatch(/ref=\{saveResultDialogRef\} className=\{BRANCH_WITHDRAW_DIALOG_WIDE_CLASS\}/);
    expect(branchWithdrawClient).toMatch(/ref=\{previewDialogRef\} className=\{BRANCH_WITHDRAW_DIALOG_PREVIEW_CLASS\}/);
  });

  test('add-item catalog dialog supports backdrop dismiss and top-right close', () => {
    expect(branchWithdrawClient).toContain('ref={addItemDialogRef}');
    expect(branchWithdrawClient).toContain('handleAddItemDialogClick');
    expect(branchWithdrawClient).toContain('closeAddItemDialog');
    expect(branchWithdrawClient).toMatch(/onClick=\{handleAddItemDialogClick\}/);
    expect(branchWithdrawClient).toMatch(/onCancel=\{\(event\) => \{[\s\S]*closeAddItemDialog\(\)/);
    expect(branchWithdrawClient).toMatch(/aria-label="ปิด"[\s\S]*<CloseIcon size="md"/);
  });
});
