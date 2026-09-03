'use client';

import { useEffect, useRef } from 'react';
import { X } from '@/lib/icons';
import type { LeaveDetailEntry } from '@/lib/dashboard/leave-details';
import { DashboardStatDetailRows } from './DashboardStatDetailRows';

type Props = {
  open: boolean;
  title: string;
  entries: LeaveDetailEntry[];
  onClose: () => void;
  variant?: 'leave' | 'holiday';
};

const DIALOG_CLASS =
  'fixed left-1/2 top-1/2 z-[100] m-0 w-[min(360px,88vw)] max-h-[min(80svh,640px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg open:flex open:flex-col backdrop:bg-black/40';

export function LeaveDetailDialog({
  open,
  title,
  entries,
  onClose,
  variant = 'leave',
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const clickedInDialogPanel =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!clickedInDialogPanel) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={DIALOG_CLASS}
      onClose={onClose}
      onClick={handleDialogClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex min-h-0 flex-col p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <DashboardStatDetailRows entries={entries} variant={variant} />
        </div>
      </div>
    </dialog>
  );
}
