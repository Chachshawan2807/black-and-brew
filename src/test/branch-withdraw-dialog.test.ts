import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  BRANCH_WITHDRAW_DIALOG_POSITION_CLASS,
  closeBranchWithdrawDialog,
  openBranchWithdrawDialog,
} from '@/lib/branch-withdraw-dialog';

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
  test('all modal dialogs portal to body with fixed centering above FAB stack', () => {
    expect(branchWithdrawClient).toContain('ModalPortal');
    expect(branchWithdrawClient).toContain('BRANCH_WITHDRAW_DIALOG_POSITION_CLASS');
    expect(branchWithdrawClient).toContain('openBranchWithdrawDialog');
    expect(branchWithdrawClient).toContain('closeBranchWithdrawDialog');
    expect(BRANCH_WITHDRAW_DIALOG_POSITION_CLASS).toContain('fixed left-1/2 top-1/2');
    expect(BRANCH_WITHDRAW_DIALOG_POSITION_CLASS).toContain('z-[220]');
    expect(branchWithdrawClient).toMatch(/const BRANCH_WITHDRAW_DIALOG_BASE_CLASS[\s\S]*BRANCH_WITHDRAW_DIALOG_POSITION_CLASS/);
    expect(branchWithdrawClient).toMatch(/<ModalPortal>[\s\S]*ref=\{previewDialogRef\}/);
    expect(branchWithdrawClient).toMatch(/<ModalPortal>[\s\S]*ref=\{addItemDialogRef\}/);
    expect(branchWithdrawClient).toMatch(/<ModalPortal>[\s\S]*ref=\{saveResultDialogRef\}/);
    expect(branchWithdrawClient).toMatch(/<ModalPortal>[\s\S]*ref=\{historyLineDialogRef\}/);
  });

  test('openBranchWithdrawDialog retries showModal once on the next animation frame', () => {
    const dialog = {
      open: false,
      showModal() {
        if ((this as { failOnce?: boolean }).failOnce) {
          (this as { failOnce?: boolean }).failOnce = false;
          throw new Error('showModal blocked');
        }
        this.open = true;
      },
      close() {
        this.open = false;
      },
    } as HTMLDialogElement & { failOnce?: boolean };

    dialog.failOnce = true;
    openBranchWithdrawDialog(dialog);
    expect(dialog.open).toBe(false);

    return new Promise<void>((resolve, reject) => {
      requestAnimationFrame(() => {
        try {
          expect(dialog.open).toBe(true);
          closeBranchWithdrawDialog(dialog);
          expect(dialog.open).toBe(false);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  test('add-item catalog dialog supports backdrop dismiss and top-right close', () => {
    expect(branchWithdrawClient).toContain('ref={addItemDialogRef}');
    expect(branchWithdrawClient).toContain('handleAddItemDialogClick');
    expect(branchWithdrawClient).toContain('closeAddItemDialog');
    expect(branchWithdrawClient).toMatch(/onClick=\{handleAddItemDialogClick\}/);
    expect(branchWithdrawClient).toMatch(/onCancel=\{\(event\) => \{[\s\S]*closeAddItemDialog\(\)/);
    expect(branchWithdrawClient).toMatch(/aria-label="ปิด"[\s\S]*<CloseIcon size="md"/);
  });

  test('history summary dialog supports backdrop dismiss and top-right close', () => {
    expect(branchWithdrawClient).toContain('ref={historyLineDialogRef}');
    expect(branchWithdrawClient).toContain('handleHistoryLineDialogClick');
    expect(branchWithdrawClient).toContain('closeHistoryLineDialog');
    expect(branchWithdrawClient).toMatch(/ref=\{historyLineDialogRef\}[\s\S]*onClick=\{handleHistoryLineDialogClick\}/);
    expect(branchWithdrawClient).toMatch(/onCancel=\{\(event\) => \{[\s\S]*closeHistoryLineDialog\(\)/);
    expect(branchWithdrawClient).toMatch(
      /ref=\{historyLineDialogRef\}[\s\S]*aria-label="ปิด"[\s\S]*<CloseIcon size="md"/,
    );
    expect(branchWithdrawClient).not.toMatch(
      /ref=\{historyLineDialogRef\}[\s\S]*>\s*ปิด\s*<\/button>/,
    );
  });
});
