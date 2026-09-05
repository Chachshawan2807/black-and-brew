'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ICON_STROKE } from '@/lib/icons';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { cn } from '@/lib/utils';
import {
  INVENTORY_BTN_PRIMARY,
  INVENTORY_BTN_SECONDARY,
  INVENTORY_MODAL_OVERLAY,
  INVENTORY_MODAL_PANEL,
  InventoryIconBadge,
  InventoryMobileSheetHandle,
  useInventoryMotion,
} from './inventory-ui-primitives';

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
  const { overlay, panel } = useInventoryMotion();

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

  if (!isMounted) return null;

  const title =
    reason === 'gap'
      ? 'เลือกวันที่ของรายการ'
      : 'ลงย้อนหลัง เลือกวันที่';
  const description =
    reason === 'gap'
      ? 'ยังไม่มีบันทึกรับเข้า/นำออกวันก่อน ระบุวันที่ที่รายการนี้เกิดขึ้นจริง'
      : 'ระบุวันที่ที่รายการนี้เกิดขึ้นจริง (ไม่ใช่วันที่กดบันทึก)';

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="transaction-date-overlay"
          initial={overlay.initial}
          animate={overlay.animate}
          exit={overlay.exit}
          transition={overlay.transition}
          className={cn(
            'fixed inset-0 z-[225] flex items-end sm:items-center justify-center p-0 sm:p-4',
            INVENTORY_MODAL_OVERLAY,
          )}
          role="presentation"
          onClick={onCancel}
        >
          <motion.div
            initial={panel.initial}
            animate={panel.animate}
            exit={panel.exit}
            transition={panel.transition}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-transaction-date-title"
            className={cn(
              INVENTORY_MODAL_PANEL,
              'w-full sm:w-[min(400px,92vw)] rounded-t-[28px] sm:rounded-2xl pb-[env(safe-area-inset-bottom)]',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-4 md:p-5">
              <InventoryMobileSheetHandle />
              <div className="flex items-start gap-3">
                <InventoryIconBadge tone="inventory" size="lg">
                  <Calendar className="w-5 h-5" strokeWidth={ICON_STROKE} />
                </InventoryIconBadge>
                <div className="min-w-0 flex-1">
                  <h3 id="inventory-transaction-date-title" className="text-base font-normal text-foreground">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
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
                  className={INVENTORY_BTN_SECONDARY}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isQuickPending || !dateValue}
                  className={INVENTORY_BTN_PRIMARY}
                >
                  ยืนยันบันทึก
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
