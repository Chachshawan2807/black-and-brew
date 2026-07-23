'use client';

import { useEffect, useRef } from 'react';
import { BEAN_ORDER_BTN_DIALOG, BEAN_ORDER_BTN_DIALOG_DANGER } from './bean-order-layout';

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const DIALOG_CLASS =
  'fixed left-1/2 top-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg open:flex open:flex-col backdrop:bg-black/40';

export function ClearCustomerConfirmDialog({ open, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={DIALOG_CLASS}
      onClose={onCancel}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="p-4 md:p-5">
        <h3 className="text-base text-foreground">ล้างข้อมูลลูกค้า</h3>
        <p className="mt-2 text-sm leading-snug text-muted-foreground">
          ต้องการล้างชื่อ เบอร์โทร และที่อยู่ลูกค้าทั้งหมดหรือไม่ การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={BEAN_ORDER_BTN_DIALOG}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={BEAN_ORDER_BTN_DIALOG_DANGER}
          >
            ล้างข้อมูล
          </button>
        </div>
      </div>
    </dialog>
  );
}
