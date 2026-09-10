'use client';

import { useState } from 'react';
import { Clipboard } from '@/lib/icons';
import type { ParsedBeanOrderCustomer } from '@/lib/bean-orders/parse-share-text';
import { formatThaiPostalAddressLine } from '@/lib/bean-orders/thai-postal-lookup';
import {
  BEAN_ORDER_BTN_DIALOG,
  BEAN_ORDER_BTN_DIALOG_DANGER,
  BEAN_ORDER_BTN_DIALOG_PRIMARY,
} from './bean-order-layout';
import {
  BeanOrderDialogShell,
  BeanOrderInlineLoading,
  BeanOrderModalHeader,
} from './bean-order-ui-primitives';

type Props = {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  data?: ParsedBeanOrderCustomer | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PasteCustomerDialog({
  open,
  loading = false,
  error = null,
  data = null,
  onConfirm,
  onCancel,
}: Props) {
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const addressPreview = data
    ? formatThaiPostalAddressLine(data.address) || data.address.addressLine || ' '
    : ' ';

  const needsDiscardGuard = Boolean(data) && !loading;

  function requestClose() {
    if (needsDiscardGuard) {
      setDiscardConfirmOpen(true);
      return;
    }
    setDiscardConfirmOpen(false);
    onCancel();
  }

  function handleBackdropClose() {
    if (discardConfirmOpen) {
      setDiscardConfirmOpen(false);
      return;
    }
    requestClose();
  }

  function confirmDiscard() {
    setDiscardConfirmOpen(false);
    onCancel();
  }

  return (
    <BeanOrderDialogShell
      open={open}
      onClose={handleBackdropClose}
      panelClassName="w-full max-w-[min(26rem,92vw)]"
      aria-label="วางข้อมูลลูกค้า"
    >
      <BeanOrderModalHeader
        icon={<Clipboard className="h-5 w-5" aria-hidden />}
        title="วางข้อมูลลูกค้า"
        subtitle="ตรวจชื่อ / เบอร์ / ที่อยู่ก่อนนำไปใส่ในฟอร์ม"
        tone="coffee"
        onClose={requestClose}
        sheet={false}
      />

      <div className="p-4 md:p-5">
        {discardConfirmOpen ? (
          <div className="mt-2">
            <p className="text-sm leading-snug text-foreground">
              ข้อมูลที่แยกแล้วจะหายไป ต้องการปิดหน้าต่างนี้โดยไม่นำไปใส่หรือไม่
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDiscardConfirmOpen(false)}
                className={BEAN_ORDER_BTN_DIALOG}
              >
                กลับไปตรวจข้อมูล
              </button>
              <button type="button" onClick={confirmDiscard} className={BEAN_ORDER_BTN_DIALOG_DANGER}>
                ปิดโดยไม่นำไปใส่
              </button>
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="mt-2 flex justify-center py-6">
                <BeanOrderInlineLoading label="กำลังแยกข้อมูล..." />
              </div>
            ) : null}

            {!loading && error ? (
              <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            ) : null}

            {!loading && data ? (
              <dl className="mt-4 space-y-3 rounded-xl border border-border bg-muted/15 p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">แหล่งที่มา</dt>
                  <dd className="mt-0.5 text-foreground">
                    {data.parseSource === 'ai' ? 'แยกด้วย AI' : 'แยกจากรูปแบบออเดอร์'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">ชื่อ</dt>
                  <dd className="mt-0.5 text-foreground">{data.name || ' '}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">เบอร์</dt>
                  <dd className="mt-0.5 tabular-nums text-foreground">{data.phone || ' '}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">ที่อยู่</dt>
                  <dd className="mt-0.5 leading-snug text-foreground">{addressPreview}</dd>
                </div>
              </dl>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={requestClose} className={BEAN_ORDER_BTN_DIALOG}>
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading || !data}
                className={BEAN_ORDER_BTN_DIALOG_PRIMARY}
              >
                นำไปใส่
              </button>
            </div>
          </>
        )}
      </div>
    </BeanOrderDialogShell>
  );
}
