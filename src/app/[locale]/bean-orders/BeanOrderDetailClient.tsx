'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, Pencil } from 'lucide-react';
import {
  deleteBeanOrder,
  confirmBeanOrderDelivered,
  confirmBeanOrderPayment,
  revertBeanOrderPayment,
  saveBeanOrderShipmentPlan,
  shipBeanOrder,
  uploadBeanOrderSlip,
  type BeanOrderDetail,
} from '@/app/actions/bean-order-actions';
import {
  formatBeanOrderCarrierChangeMessage,
  getCarrierLabel,
  initialCarrierSelection,
  resolveCarrierCodeForSave,
} from '@/lib/bean-orders/carriers';
import {
  resolveBeanOrderTrackingNumberForSave,
  shouldMarkBeanOrderShipped,
  validateBeanOrderShipmentCarrier,
} from '@/lib/bean-orders/shipment-persist';
import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import { formatShipmentTrackingLabel } from '@/lib/bean-orders/tracking-status-labels';
import { PaymentSlipViewer } from './_components/PaymentSlipViewer';
import { BeanOrderShippingFields } from './_components/BeanOrderShippingFields';
import {
  canConfirmPayment,
  canDeleteOrder,
  canEditOrder,
  canEditShipment,
  canRevertPayment,
  canUploadSlip,
  isConfirmPaymentButtonEnabled,
  shouldShowDeliveredButton,
} from '@/lib/bean-orders/order-status';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';
import { navigateWithViewTransition } from '@/lib/view-transition';
import {
  stashBeanOrderDeliveredPatch,
} from '@/lib/bean-orders/delivered-notify-snapshot';
import { OrderListStatusGroup } from './_components/OrderStatusBadge';
import { BEAN_ORDER_CARD, BEAN_ORDER_DETAIL_BODY_GRID, BEAN_ORDER_DETAIL_FULFILLMENT_CARD, BEAN_ORDER_DETAIL_LINES_CARD, BEAN_ORDER_DETAIL_PAGE, BEAN_ORDER_DETAIL_PAYMENT_BODY, BEAN_ORDER_DETAIL_PAYMENT_COLUMN, BEAN_ORDER_DETAIL_PAYMENT_SHIPPING_GRID, BEAN_ORDER_DETAIL_PAYMENT_SLIP_SLOT, BEAN_ORDER_DETAIL_SHIPPING_COLUMN, BEAN_ORDER_INPUT, BEAN_ORDER_ACTION_BTN, BEAN_ORDER_ACTION_BTN_CONFIRM, BEAN_ORDER_ACTION_BTN_INFO, BEAN_ORDER_ACTION_BTN_DANGER, BEAN_ORDER_ACTION_BTN_OUTLINE, BEAN_ORDER_PAYMENT_ACTIONS } from './_components/bean-order-layout';
import { cn } from '@/lib/utils';

type Props = {
  order: BeanOrderDetail;
  locale: string;
};

function formatBaht(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function BeanOrderDetailClient({ order: initialOrder, locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isReadOnly = useReadOnly();
  const fileRef = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlipPreview, setPendingSlipPreview] = useState<string | null>(null);

  const initialCarrier = initialCarrierSelection(order.shipment?.carrierCode);
  const [carrierCode, setCarrierCode] = useState(initialCarrier.carrierCode);
  const [customCarrierLabel, setCustomCarrierLabel] = useState(initialCarrier.customCarrierLabel);
  const [trackingNumber, setTrackingNumber] = useState(order.shipment?.trackingNumber ?? '');

  useEffect(() => {
    setOrder(initialOrder);
    const nextCarrier = initialCarrierSelection(initialOrder.shipment?.carrierCode);
    setCarrierCode(nextCarrier.carrierCode);
    setCustomCarrierLabel(nextCarrier.customCarrierLabel);
    setTrackingNumber(initialOrder.shipment?.trackingNumber ?? '');
  }, [initialOrder]);

  useEffect(() => {
    const flash = sessionStorage.getItem('bb-bean-order-flash');
    if (flash) {
      setMessage(flash);
      sessionStorage.removeItem('bb-bean-order-flash');
    } else {
      setMessage(null);
    }
  }, [pathname]);

  const cancelled = Boolean(order.cancelledAt);
  const editable = canEditOrder(order.cancelledAt);
  const canPay = canUploadSlip(order.cancelledAt);
  const canConfirm = canConfirmPayment(order.paymentStatus, order.cancelledAt);
  const canRevert = canRevertPayment(order.paymentStatus, order.cancelledAt);
  const canEditShipping = canEditShipment(order.cancelledAt);
  const canDelete = canDeleteOrder(order.fulfillmentStatus, order.cancelledAt);
  const showDeliveredButton = shouldShowDeliveredButton(
    order.fulfillmentStatus,
    order.shipment?.trackingStatus,
    trackingNumber,
    order.cancelledAt,
  );
  const hasSlip = Boolean(order.payment?.uploadedAt || pendingSlipPreview);
  const confirmEnabled = isConfirmPaymentButtonEnabled(hasSlip);

  const shipmentTrackingLabel = order.shipment
    ? formatShipmentTrackingLabel(order.shipment.trackingStatus, {
        fulfillmentStatus: order.fulfillmentStatus,
        trackingNumber: order.shipment.trackingNumber,
      })
    : null;

  function reload() {
    router.refresh();
  }

  async function handleUploadSlip(file: File) {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }

    const previewUrl = URL.createObjectURL(file);
    setPendingSlipPreview(previewUrl);
    setBusy(true);
    setError(null);

    const fd = new FormData();
    fd.set('slip', file);
    const result = await uploadBeanOrderSlip(order.id, fd, locale);

    URL.revokeObjectURL(previewUrl);
    setPendingSlipPreview(null);
    setBusy(false);

    if (!result.success) {
      setError(result.error ?? 'อัปโหลดไม่สำเร็จ');
      return;
    }

    setOrder((prev) => ({
      ...prev,
      payment: {
        slipUrl: result.slipUrl ?? null,
        uploadedAt: result.uploadedAt ?? new Date().toISOString(),
        confirmedAt: prev.payment?.confirmedAt ?? null,
        confirmedBy: prev.payment?.confirmedBy ?? null,
      },
    }));
  }

  async function handleConfirmPayment() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    if (!isConfirmPaymentButtonEnabled(Boolean(order.payment?.uploadedAt))) {
      setError('อัปโหลดสลิปแล้ว ไม่สามารถยืนยันชำระจากปุ่มนี้ได้');
      return;
    }
    setBusy(true);
    const result = await confirmBeanOrderPayment(order.id, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'ยืนยันไม่สำเร็จ'); return; }
    setOrder((prev) => ({ ...prev, paymentStatus: 'paid' }));
    setMessage('ยืนยันชำระเงินแล้ว');
    void reload();
  }

  async function handleRevertPayment() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    if (!confirm('เปลี่ยนสถานะเป็นรอชำระ?')) return;
    setBusy(true);
    const result = await revertBeanOrderPayment(order.id, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'เปลี่ยนสถานะไม่สำเร็จ'); return; }
    setOrder((prev) => ({ ...prev, paymentStatus: 'unpaid' }));
    setMessage('เปลี่ยนเป็นรอชำระแล้ว');
    void reload();
  }

  async function handleShip() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    const carrierValidation = validateBeanOrderShipmentCarrier({
      carrierCode,
      customCarrierLabel,
    });
    if (!carrierValidation.ok) {
      setError(carrierValidation.error);
      return;
    }
    const resolvedCarrierCode = carrierValidation.resolvedCarrierCode;
    const previousCarrierCode = order.shipment?.carrierCode ?? null;
    const resolvedTrackingNumber = resolveBeanOrderTrackingNumberForSave({
      trackingNumber,
      previousTrackingNumber: order.shipment?.trackingNumber,
      fulfillmentStatus: order.fulfillmentStatus,
    });
    const markShipped = shouldMarkBeanOrderShipped({
      trackingNumber,
      fulfillmentStatus: order.fulfillmentStatus,
    });
    setBusy(true);
    const result = markShipped
      ? await shipBeanOrder(
          order.id,
          { carrierCode: resolvedCarrierCode, trackingNumber: resolvedTrackingNumber },
          locale,
        )
      : await saveBeanOrderShipmentPlan(
          order.id,
          { carrierCode: resolvedCarrierCode },
          locale,
        );
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'บันทึกจัดส่งไม่สำเร็จ'); return; }
    setOrder((prev) => ({
      ...prev,
      fulfillmentStatus: markShipped ? 'shipped' : prev.fulfillmentStatus,
      shipment: {
        deliveryType: 'parcel',
        carrierCode: resolvedCarrierCode,
        trackingNumber: resolvedTrackingNumber || null,
        trackingStatus: prev.shipment?.trackingStatus ?? null,
        shippedAt: prev.shipment?.shippedAt ?? new Date().toISOString(),
      },
    }));
    setMessage(formatBeanOrderCarrierChangeMessage(previousCarrierCode, resolvedCarrierCode));
    void reload();
  }

  async function handleConfirmDelivered() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    if (!confirm('ยืนยันว่าจัดส่งสำเร็จแล้ว?')) return;

    const resolvedCarrierCode = resolveCarrierCodeForSave(carrierCode, customCarrierLabel);
    if (!resolvedCarrierCode) {
      setError('กรุณาระบุช่องทางจัดส่ง');
      return;
    }

    setBusy(true);
    setError(null);

    const result = await confirmBeanOrderDelivered(order.id, locale, {
      shipment:
        order.fulfillmentStatus !== 'shipped'
          ? { carrierCode: resolvedCarrierCode, trackingNumber }
          : undefined,
    });
    if (!result.success) {
      setBusy(false);
      setError(result.error ?? 'ยืนยันจัดส่งไม่สำเร็จ');
      return;
    }
    sessionStorage.setItem('bb-bean-order-flash', 'จัดส่งสำเร็จ');
    stashBeanOrderDeliveredPatch(order.id);
    setBusy(false);
    navigateWithViewTransition(router.push, `/${locale}/bean-orders`);
  }

  async function handleDelete() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    if (!confirm('ลบออเดอร์นี้?')) return;
    setBusy(true);
    const result = await deleteBeanOrder(order.id, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'ลบไม่สำเร็จ'); return; }
    navigateWithViewTransition(router.push, `/${locale}/bean-orders`);
  }

  const inputClass = BEAN_ORDER_INPUT;

  return (
    <div className={BEAN_ORDER_DETAIL_PAGE}>
      <Link href={`/${locale}/bean-orders`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden /> กลับรายการ
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl font-normal">{order.orderNo}</h1>
          <OrderListStatusGroup
            slipUploadedAt={order.payment?.uploadedAt}
            paymentStatus={order.paymentStatus}
            trackingStatus={order.shipment?.trackingStatus}
            cancelledAt={order.cancelledAt}
          />
        </div>
        {editable && !isReadOnly ? (
          <Link
            href={`/${locale}/bean-orders/${order.id}/edit`}
            className={BEAN_ORDER_ACTION_BTN_OUTLINE}
          >
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
            แก้ไขออเดอร์
          </Link>
        ) : null}
      </div>

      {message && (
        <p className="mb-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground">{message}</p>
      )}
      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <section className={`${BEAN_ORDER_CARD} mb-4 p-4`}>
        <div className="min-w-0 space-y-1 text-sm">
          <p className="text-xs text-muted-foreground">ลูกค้า</p>
          <p className="text-foreground">
            {getBeanOrderCustomerDisplayName(order)}
            {order.recipientPhone ? <span className="text-muted-foreground"> / {order.recipientPhone}</span> : null}
          </p>
          <p className="text-muted-foreground leading-snug">
            {order.recipientAddress}
            {order.recipientProvince || order.recipientPostalCode
              ? ` ${[order.recipientProvince, order.recipientPostalCode].filter(Boolean).join(' ')}`
              : ''}
          </p>
        </div>
      </section>

      <div
        className={cn(
          BEAN_ORDER_DETAIL_BODY_GRID,
          cancelled && 'lg:grid-cols-1',
        )}
      >
        <section
          className={cn(
            BEAN_ORDER_CARD,
            BEAN_ORDER_DETAIL_LINES_CARD,
            'p-4',
            cancelled && 'lg:w-full',
          )}
        >
          <h2 className="mb-2 shrink-0 text-sm text-muted-foreground">รายการ</h2>
          <ul className="min-h-0 flex-1 divide-y divide-border text-sm">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
                <span>
                  {line.itemName} / {line.weightValue}
                  {line.weightUnit === 'g' ? ' ก.' : ' กก.'}
                </span>
                <span className="shrink-0 tabular-nums">{formatBaht(line.lineTotalBaht)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 shrink-0 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground sm:text-sm">
            <p className="flex justify-between gap-4">
              <span>รวมสินค้า</span>
              <span className="tabular-nums text-foreground">{formatBaht(order.subtotalBaht)}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span>ส่วนลด</span>
              <span className="tabular-nums text-foreground">-{formatBaht(order.discountBaht)}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span>ค่าส่ง</span>
              <span className="tabular-nums text-foreground">{formatBaht(order.shippingBaht)}</span>
            </p>
            <p className="flex justify-between gap-4 border-t border-border pt-1 text-foreground">
              <span>ยอดรวม</span>
              <span className="tabular-nums">{formatBaht(order.totalBaht)}</span>
            </p>
          </div>
          {order.notes ? (
            <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
              หมายเหตุ: <span className="text-foreground">{order.notes}</span>
            </p>
          ) : null}
        </section>

        {!cancelled ? (
          <section className={cn(BEAN_ORDER_CARD, BEAN_ORDER_DETAIL_FULFILLMENT_CARD, 'p-4')}>
            <div
              className={cn(
                BEAN_ORDER_DETAIL_PAYMENT_SHIPPING_GRID,
                !(canEditShipping && !isReadOnly) && 'lg:grid-cols-1',
              )}
            >
              <div className={BEAN_ORDER_DETAIL_PAYMENT_COLUMN}>
                <h2 className="text-sm text-muted-foreground">ชำระเงิน</h2>
                {order.payment?.confirmedAt ? (
                  <p className="text-xs text-muted-foreground">
                    ยืนยันชำระแล้ว
                    {order.payment.confirmedBy ? ` / ${order.payment.confirmedBy}` : ''}
                  </p>
                ) : null}
                <div className={BEAN_ORDER_DETAIL_PAYMENT_BODY}>
                  {!isReadOnly && editable ? (
                    <div className={BEAN_ORDER_PAYMENT_ACTIONS}>
                      {canPay ? (
                        <>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleUploadSlip(file);
                            }}
                          />
                          <button
                            type="button"
                            disabled={busy}
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
                          disabled={busy || !confirmEnabled}
                          onClick={() => void handleConfirmPayment()}
                          className={cn(
                            'h-auto min-h-11 w-full px-3 py-2 text-center text-xs leading-snug sm:text-sm',
                            confirmEnabled
                              ? BEAN_ORDER_ACTION_BTN_CONFIRM
                              : 'inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-border bg-muted px-5 text-sm text-muted-foreground opacity-70',
                          )}
                        >
                          ยืนยันชำระแล้ว
                        </button>
                      ) : null}
                      {canRevert ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRevertPayment()}
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
                  <div className={BEAN_ORDER_DETAIL_PAYMENT_SLIP_SLOT}>
                    {hasSlip ? (
                      <PaymentSlipViewer
                        orderId={order.id}
                        slipUrl={order.payment?.slipUrl ?? null}
                        previewUrl={pendingSlipPreview}
                        uploadedAt={order.payment?.uploadedAt}
                        variant="panel"
                      />
                    ) : (
                      <div className="flex h-full min-h-[9rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-2 text-center text-xs text-muted-foreground">
                        ยังไม่มีสลิป
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {canEditShipping && !isReadOnly ? (
                <div className={BEAN_ORDER_DETAIL_SHIPPING_COLUMN}>
                  <h2 className="text-sm text-muted-foreground">จัดส่ง</h2>
                  <div className="space-y-2">
                    <BeanOrderShippingFields
                      carrierCode={carrierCode}
                      customCarrierLabel={customCarrierLabel}
                      trackingNumber={trackingNumber}
                      onCarrierCodeChange={setCarrierCode}
                      onCustomCarrierLabelChange={setCustomCarrierLabel}
                      onTrackingNumberChange={setTrackingNumber}
                      inputClass={inputClass}
                      trackingPlaceholder="เลขพัสดุ (ไม่บังคับ)"
                      disabled={busy}
                    />
                    <div className="flex flex-wrap gap-2">
                      {showDeliveredButton ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleConfirmDelivered()}
                          className={BEAN_ORDER_ACTION_BTN_INFO}
                        >
                          จัดส่งสำเร็จ
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleShip()}
                        className={BEAN_ORDER_ACTION_BTN}
                      >
                        {order.fulfillmentStatus === 'shipped' ? 'อัปเดตการจัดส่ง' : 'บันทึกการจัดส่ง'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {!cancelled && canDelete && !isReadOnly ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className={BEAN_ORDER_ACTION_BTN_DANGER}
          >
            ลบออเดอร์
          </button>
        </div>
      ) : null}

      {order.shipment ? (
        <section className={`${BEAN_ORDER_CARD} mb-4 p-4`}>
          <h2 className="mb-2 text-xs text-muted-foreground">การจัดส่ง</h2>
          <div className="space-y-1 text-sm">
            <p className="text-foreground">{getCarrierLabel(order.shipment.carrierCode)}</p>
            {order.shipment.trackingNumber ? (
              <p className="text-muted-foreground">
                พัสดุ <span className="text-foreground">{order.shipment.trackingNumber}</span>
                {shipmentTrackingLabel ? <span> / {shipmentTrackingLabel}</span> : null}
              </p>
            ) : shipmentTrackingLabel ? (
              <p className="text-muted-foreground">{shipmentTrackingLabel}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={`${BEAN_ORDER_CARD} p-4`}>
        <h2 className="mb-2 text-xs text-muted-foreground">ประวัติ</h2>
        <ul className="divide-y divide-border text-sm">
          {order.statusHistory.length === 0 ? (
            <li className="py-1 text-muted-foreground">—</li>
          ) : (
            order.statusHistory.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="py-2 first:pt-0 last:pb-0 text-muted-foreground">
                <span className="tabular-nums text-foreground/80">
                  {new Date(entry.at).toLocaleString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {' / '}
                {entry.action}
                {' / '}
                {entry.by}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
