'use client';

import { useRef } from 'react';
import { ImageDown } from '@/lib/icons';
import {
  BEAN_ORDER_ACTION_BTN_CONFIRM,
  BEAN_ORDER_ACTION_BTN_OUTLINE,
  BEAN_ORDER_PAYMENT_ACTIONS,
  BEAN_ORDER_PAYMENT_BODY,
  BEAN_ORDER_PAYMENT_SLIP_SLOT,
} from './bean-order-layout';
import { PaymentSlipViewer } from './PaymentSlipViewer';
import {
  canConfirmPayment,
  canRevertPayment,
  canUploadSlip,
  isConfirmPaymentButtonEnabled,
} from '@/lib/bean-orders/order-status';
import type { PaymentStatus } from '@/lib/bean-orders/types';
import { cn } from '@/lib/utils';

type Props = {
  orderId?: string;
  slipUrl: string | null;
  uploadedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  paymentStatus: PaymentStatus;
  pendingSlipFile: File | null;
  pendingSlipPreview: string | null;
  onSelectSlipFile: (file: File | null) => void;
  confirmPaymentOnSave: boolean;
  onConfirmPaymentOnSaveChange: (value: boolean) => void;
  onRequestRevertPayment: () => void;
  disabled?: boolean;
};

export function BeanOrderPaymentFields({
  orderId,
  slipUrl,
  uploadedAt,
  confirmedAt,
  confirmedBy,
  paymentStatus,
  pendingSlipFile,
  pendingSlipPreview,
  onSelectSlipFile,
  confirmPaymentOnSave,
  onConfirmPaymentOnSaveChange,
  onRequestRevertPayment,
  disabled = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hasSlip = Boolean(uploadedAt || pendingSlipFile);
  const canPay = canUploadSlip();
  const canConfirm = canConfirmPayment(paymentStatus);
  const confirmEnabled = isConfirmPaymentButtonEnabled(hasSlip);
  const canRevert = canRevertPayment(paymentStatus);

  return (
    <div className="flex flex-1 flex-col space-y-3">
      {confirmedAt ? (
        <p className="text-xs text-muted-foreground">
          ยืนยันชำระแล้ว
          {confirmedBy ? ` / ${confirmedBy}` : ''}
        </p>
      ) : null}
      <div className={cn(BEAN_ORDER_PAYMENT_BODY, 'flex-1')}>
        {!disabled && (canPay || canConfirm || canRevert) ? (
          <div className={BEAN_ORDER_PAYMENT_ACTIONS}>
            {canPay ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  name="bean-order-payment-slip"
                  accept="image/*"
                  className="hidden"
                  disabled={disabled}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    onSelectSlipFile(file);
                    onConfirmPaymentOnSaveChange(false);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    BEAN_ORDER_ACTION_BTN_OUTLINE,
                    'h-auto min-h-11 w-full px-3 py-2 text-center text-xs leading-snug sm:text-sm',
                  )}
                >
                  {hasSlip ? 'เปลี่ยนสลิป' : 'อัปโหลดสลิป'}
                </button>
              </>
            ) : null}
            {canConfirm ? (
              <button
                type="button"
                disabled={disabled || !confirmEnabled}
                onClick={() => onConfirmPaymentOnSaveChange(!confirmPaymentOnSave)}
                className={cn(
                  'h-auto min-h-11 w-full px-3 py-2 text-center text-xs leading-snug sm:text-sm',
                  confirmEnabled
                    ? cn(
                        BEAN_ORDER_ACTION_BTN_CONFIRM,
                        confirmPaymentOnSave && 'ring-2 ring-foreground/20',
                      )
                    : 'inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-2xl border border-border bg-muted px-5 text-sm text-muted-foreground opacity-70',
                )}
              >
                {confirmPaymentOnSave && confirmEnabled
                  ? 'จะยืนยันชำระเมื่อบันทึก'
                  : 'ยืนยันชำระแล้ว'}
              </button>
            ) : null}
            {canRevert ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onRequestRevertPayment}
                className={cn(
                  BEAN_ORDER_ACTION_BTN_OUTLINE,
                  'h-auto min-h-11 w-full px-3 py-2 text-center text-xs leading-snug sm:text-sm',
                )}
              >
                เปลี่ยนเป็นรอชำระ
              </button>
            ) : null}
          </div>
        ) : null}
        <div className={BEAN_ORDER_PAYMENT_SLIP_SLOT}>
          {pendingSlipPreview || (hasSlip && orderId) ? (
            <PaymentSlipViewer
              orderId={orderId}
              slipUrl={slipUrl}
              previewUrl={pendingSlipPreview}
              uploadedAt={uploadedAt}
              variant="panel"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/10 px-4 text-sm text-muted-foreground">
              <ImageDown className="h-5 w-5 opacity-40" aria-hidden />
              ยังไม่มีสลิป
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
