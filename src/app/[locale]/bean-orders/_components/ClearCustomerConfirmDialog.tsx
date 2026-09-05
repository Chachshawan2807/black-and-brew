'use client';

import { Trash2 } from '@/lib/icons';
import { BEAN_ORDER_BTN_DIALOG, BEAN_ORDER_BTN_DIALOG_DANGER } from './bean-order-layout';
import {
  BeanOrderDialogShell,
  BeanOrderIconBadge,
} from './bean-order-ui-primitives';

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ClearCustomerConfirmDialog({ open, onConfirm, onCancel }: Props) {
  return (
    <BeanOrderDialogShell open={open} onClose={onCancel} aria-label="ล้างข้อมูลลูกค้า">
      <div className="p-4 md:p-5 text-center">
        <BeanOrderIconBadge tone="warn" size="lg" className="mx-auto mb-4 mt-2">
          <Trash2 className="h-5 w-5" aria-hidden />
        </BeanOrderIconBadge>
        <h3 className="text-base text-foreground">ล้างข้อมูลลูกค้า</h3>
        <p className="mt-2 text-sm leading-snug text-muted-foreground">
          ต้องการล้างชื่อ เบอร์โทร และที่อยู่ลูกค้าทั้งหมดหรือไม่ การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={BEAN_ORDER_BTN_DIALOG}>
            ยกเลิก
          </button>
          <button type="button" onClick={onConfirm} className={BEAN_ORDER_BTN_DIALOG_DANGER}>
            ล้างข้อมูล
          </button>
        </div>
      </div>
    </BeanOrderDialogShell>
  );
}
