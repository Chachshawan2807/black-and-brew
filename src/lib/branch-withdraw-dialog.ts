import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { cn } from '@/lib/utils';

/** Portaled native dialog positioning so showModal escapes main layout containment on mobile. */
export const BRANCH_WITHDRAW_DIALOG_POSITION_CLASS = cn(
  'fixed left-1/2 top-1/2 m-0 -translate-x-1/2 -translate-y-1/2',
  INVENTORY_MODAL_Z_CLASS,
);

/** Open a branch-withdraw native dialog with a one-frame retry for Android WebView quirks. */
export function openBranchWithdrawDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog || dialog.open) return;

  try {
    dialog.showModal();
    return;
  } catch (error) {
    console.error('[openBranchWithdrawDialog] showModal failed:', error);
  }

  requestAnimationFrame(() => {
    if (!dialog || dialog.open) return;
    try {
      dialog.showModal();
    } catch (retryError) {
      console.error('[openBranchWithdrawDialog] showModal retry failed:', retryError);
    }
  });
}

export function closeBranchWithdrawDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog?.open) return;
  dialog.close();
}
