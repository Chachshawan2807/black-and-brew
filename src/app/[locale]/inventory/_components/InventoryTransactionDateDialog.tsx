'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { cn } from '@/lib/utils';

export type InventoryTransactionDateDialogProps = {
  open: boolean;
  dateValue: string;
  onDateChange: (date: string) => void;
  reason: 'backfill' | 'gap';
  isQuickPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function InventoryTransactionDateDialog({
  open,
  dateValue,
  onDateChange,
  reason,
  isQuickPending,
  onConfirm,
  onCancel,
}: InventoryTransactionDateDialogProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !isMounted) return null;

  const title =
    reason === 'gap'
      ? 'เลือกวันที่ของรายการ'
      : 'ลงย้อนหลัง — เลือกวันที่';
  const description =
    reason === 'gap'
      ? 'ยังไม่มีบันทึกรับเข้า/นำออกวันก่อน — ระบุวันที่ที่รายการนี้เกิดขึ้นจริง'
      : 'ระบุวันที่ที่รายการนี้เกิดขึ้นจริง (ไม่ใช่วันที่กดบันทึก)';

  return createPortal(
    <div
      className="fixed inset-0 z-[225] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-transaction-date-title"
        className="w-[min(400px,92vw)] overflow-hidden rounded-2xl border border-border bg-card text-foreground bb-shadow-xl pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-4 md:p-5">
          <h3 id="inventory-transaction-date-title" className="text-base font-normal">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-4">
            <ClickableDatePicker
              value={dateValue}
              onChange={(e) => onDateChange(e.target.value)}
              placeholder="เลือกวันที่"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isQuickPending}
              className="h-10 rounded-xl border border-border bg-background px-4 text-sm transition-colors hover:bg-muted disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isQuickPending || !dateValue}
              className={cn(
                'h-10 rounded-xl px-4 text-sm font-normal transition-colors disabled:opacity-50',
                'bg-foreground text-background hover:opacity-90',
              )}
            >
              ยืนยันบันทึก
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
