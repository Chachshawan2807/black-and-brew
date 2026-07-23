'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { ParsedBeanOrderCustomer } from '@/lib/bean-orders/parse-share-text';
import { formatThaiPostalAddressLine } from '@/lib/bean-orders/thai-postal-lookup';

import { BEAN_ORDER_BTN_DIALOG, BEAN_ORDER_BTN_DIALOG_PRIMARY } from './bean-order-layout';

type Props = {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  data?: ParsedBeanOrderCustomer | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const DIALOG_CLASS =
  'fixed left-1/2 top-1/2 z-50 w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg open:flex open:flex-col backdrop:bg-black/40';

export function PasteCustomerDialog({
  open,
  loading = false,
  error = null,
  data = null,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const addressPreview = data
    ? formatThaiPostalAddressLine(data.address) || data.address.addressLine || '—'
    : '—';

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
        <h3 className="text-base text-foreground">วางข้อมูลลูกค้า</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          ตรวจชื่อ / เบอร์ / ที่อยู่ก่อนนำไปใส่ในฟอร์ม
        </p>

        {loading ? (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            กำลังแยกข้อมูล...
          </div>
        ) : null}

        {!loading && error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {!loading && data ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">แหล่งที่มา</dt>
              <dd className="text-foreground">
                {data.parseSource === 'ai' ? 'แยกด้วย AI' : 'แยกจากรูปแบบออเดอร์'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ชื่อ</dt>
              <dd className="text-foreground">{data.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">เบอร์</dt>
              <dd className="tabular-nums text-foreground">{data.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ที่อยู่</dt>
              <dd className="leading-snug text-foreground">{addressPreview}</dd>
            </div>
          </dl>
        ) : null}

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
            disabled={loading || !data}
            className={BEAN_ORDER_BTN_DIALOG_PRIMARY}
          >
            นำไปใส่
          </button>
        </div>
      </div>
    </dialog>
  );
}
