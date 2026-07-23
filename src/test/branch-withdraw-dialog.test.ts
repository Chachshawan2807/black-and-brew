import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const branchWithdrawClient = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
  'utf-8',
);

describe('branch withdraw dialogs', () => {
  test('all modal dialogs center with m-auto and respect mobile viewport height', () => {
    expect(branchWithdrawClient).toMatch(/const BRANCH_WITHDRAW_DIALOG_BASE_CLASS[\s\S]*m-auto max-h-\[min\(85dvh,100%\)\]/);
    expect(branchWithdrawClient).toMatch(/ref=\{historyLineDialogRef\} className=\{BRANCH_WITHDRAW_DIALOG_HISTORY_CLASS\}/);
    expect(branchWithdrawClient).not.toMatch(/detailDialogRef/);
    expect(branchWithdrawClient).toMatch(/ref=\{saveResultDialogRef\} className=\{BRANCH_WITHDRAW_DIALOG_WIDE_CLASS\}/);
    expect(branchWithdrawClient).toMatch(/ref=\{previewDialogRef\} className=\{BRANCH_WITHDRAW_DIALOG_PREVIEW_CLASS\}/);
  });
});
