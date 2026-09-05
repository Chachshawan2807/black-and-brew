'use client';

import { Clipboard } from '@/lib/icons';
import type { ParsedBeanOrderCustomer } from '@/lib/bean-orders/parse-share-text';
import { formatThaiPostalAddressLine } from '@/lib/bean-orders/thai-postal-lookup';
import { BEAN_ORDER_BTN_DIALOG, BEAN_ORDER_BTN_DIALOG_PRIMARY } from './bean-order-layout';
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
  const addressPreview = data
    ? formatThaiPostalAddressLine(data.address) || data.address.addressLine || ' '
    : ' ';

  return (
    <BeanOrderDialogShell open={open} onClose={onCancel} aria-label="วางข้อมูลลูกค้า">
      <BeanOrderModalHeader
        icon={<Clipboard className="h-5 w-5" aria-hidden />}
        title="วางข้อมูลลูกค้า"
        subtitle="ตรวจชื่อ / เบอร์ / ที่อยู่ก่อนนำไปใส่ในฟอร์ม"
        tone="coffee"
        onClose={onCancel}
        sheet={false}
      />

      <div className="p-4 md:p-5">
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
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">แหล่งที่มา</dt>
              <dd className="text-foreground">
                {data.parseSource === 'ai' ? 'แยกด้วย AI' : 'แยกจากรูปแบบออเดอร์'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ชื่อ</dt>
              <dd className="text-foreground">{data.name || ' '}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">เบอร์</dt>
              <dd className="tabular-nums text-foreground">{data.phone || ' '}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ที่อยู่</dt>
              <dd className="leading-snug text-foreground">{addressPreview}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={BEAN_ORDER_BTN_DIALOG}>
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
    </BeanOrderDialogShell>
  );
}
