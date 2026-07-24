'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, Pencil } from 'lucide-react';
import {
  cancelBeanOrder,
  confirmBeanOrderDelivered,
  confirmBeanOrderPayment,
  getBeanOrderSlipSignedUrl,
  revertBeanOrderPayment,
  shipBeanOrder,
  uploadBeanOrderSlip,
  type BeanOrderDetail,
} from '@/app/actions/bean-order-actions';
import {
  BEAN_ORDER_CARRIERS,
  getCarrierLabel,
  initialCarrierSelection,
  OTHER_CARRIER_CODE,
  resolveCarrierCodeForSave,
} from '@/lib/bean-orders/carriers';
import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import { formatShipmentTrackingLabel } from '@/lib/bean-orders/trackingmore';
import { TrackingTimeline } from './_components/TrackingTimeline';
import { PaymentSlipViewer } from './_components/PaymentSlipViewer';
import { BeanOrderSelect } from './_components/BeanOrderSelect';
import {
  canCancelOrder,
  canConfirmManualDelivery,
  canConfirmPayment,
  canEditOrder,
  canEditShipment,
  canRevertPayment,
  canUploadSlip,
} from '@/lib/bean-orders/order-status';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';
import { OrderListStatusGroup } from './_components/OrderStatusBadge';
import { BEAN_ORDER_CARD, BEAN_ORDER_DETAIL_PAGE, BEAN_ORDER_INPUT, BEAN_ORDER_ACTION_BTN, BEAN_ORDER_ACTION_BTN_CONFIRM, BEAN_ORDER_ACTION_BTN_DANGER, BEAN_ORDER_ACTION_BTN_OUTLINE, BEAN_ORDER_PAYMENT_ACTIONS, BEAN_ORDER_PAYMENT_BODY, BEAN_ORDER_PAYMENT_COLUMN, BEAN_ORDER_PAYMENT_SHIPPING_GRID, BEAN_ORDER_PAYMENT_SLIP_SLOT, BEAN_ORDER_SHIPPING_COLUMN } from './_components/bean-order-layout';
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
  const isReadOnly = useReadOnly();
  const fileRef = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState(initialOrder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialCarrier = initialCarrierSelection(order.shipment?.carrierCode);
  const [carrierCode, setCarrierCode] = useState(initialCarrier.carrierCode);
  const [customCarrierLabel, setCustomCarrierLabel] = useState(initialCarrier.customCarrierLabel);
  const [trackingNumber, setTrackingNumber] = useState(order.shipment?.trackingNumber ?? '');

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  const cancelled = Boolean(order.cancelledAt);
  const editable = canEditOrder(order.cancelledAt);
  const canPay = canUploadSlip(order.cancelledAt);
  const canConfirm = canConfirmPayment(order.paymentStatus, order.cancelledAt);
  const canRevert = canRevertPayment(order.paymentStatus, order.cancelledAt);
  const canEditShipping = canEditShipment(order.cancelledAt);
  const canCancel = canCancelOrder(order.fulfillmentStatus, order.cancelledAt);
  const canManualDeliver = canConfirmManualDelivery(
    order.fulfillmentStatus,
    order.shipment?.trackingNumber,
    order.shipment?.trackingStatus,
    order.cancelledAt,
  );
  const hasSlip = Boolean(order.payment?.uploadedAt);

  const shipmentTrackingLabel = order.shipment
    ? formatShipmentTrackingLabel(order.shipment.trackingStatus, {
        fulfillmentStatus: order.fulfillmentStatus,
        trackingNumber: order.shipment.trackingNumber,
      })
    : null;

  async function reload() {
    router.refresh();
  }

  async function handleUploadSlip(file: File) {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('slip', file);
    const result = await uploadBeanOrderSlip(order.id, fd, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'อัปโหลดไม่สำเร็จ'); return; }

    const slipResult = await getBeanOrderSlipSignedUrl(order.id);
    if (!slipResult.success) {
      setError(slipResult.error ?? 'โหลดสลิปไม่สำเร็จ');
      await reload();
      return;
    }

    setOrder((prev) => ({
      ...prev,
      payment: {
        slipUrl: slipResult.slipUrl ?? null,
        uploadedAt: new Date().toISOString(),
        confirmedAt: prev.payment?.confirmedAt ?? null,
        confirmedBy: prev.payment?.confirmedBy ?? null,
      },
    }));
    await reload();
  }

  async function handleConfirmPayment() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    setBusy(true);
    const result = await confirmBeanOrderPayment(order.id, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'ยืนยันไม่สำเร็จ'); return; }
    setOrder((prev) => ({ ...prev, paymentStatus: 'paid' }));
    setMessage('ยืนยันชำระเงินแล้ว');
    await reload();
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
    await reload();
  }

  async function handleShip() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    const resolvedCarrierCode = resolveCarrierCodeForSave(carrierCode, customCarrierLabel);
    if (!resolvedCarrierCode) {
      setError('กรุณาระบุช่องทางจัดส่ง');
      return;
    }
    setBusy(true);
    const result = await shipBeanOrder(
      order.id,
      { carrierCode: resolvedCarrierCode, trackingNumber },
      locale,
    );
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'บันทึกจัดส่งไม่สำเร็จ'); return; }
    setOrder((prev) => ({ ...prev, fulfillmentStatus: 'shipped' }));
    if (result.trackingWarning) setMessage(`บันทึกจัดส่งแล้ว (ติดตามพัสดุ: ${result.trackingWarning})`);
    else setMessage(order.fulfillmentStatus === 'shipped' ? 'อัปเดตการจัดส่งแล้ว' : 'บันทึกจัดส่งแล้ว');
    await reload();
  }

  async function handleConfirmDelivered() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    if (!confirm('ยืนยันว่าจัดส่งถึงลูกค้าแล้ว?')) return;
    setBusy(true);
    setError(null);
    const result = await confirmBeanOrderDelivered(order.id, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'ยืนยันจัดส่งไม่สำเร็จ'); return; }
    setOrder((prev) => ({
      ...prev,
      shipment: prev.shipment
        ? { ...prev.shipment, trackingStatus: 'delivered' }
        : prev.shipment,
    }));
    setMessage('ยืนยันจัดส่งแล้ว');
    await reload();
  }

  async function handleCancel() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    if (!confirm('ยกเลิกออเดอร์นี้?')) return;
    setBusy(true);
    const result = await cancelBeanOrder(order.id, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'ยกเลิกไม่สำเร็จ'); return; }
    router.push(`/${locale}/bean-orders`);
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

      <section className={`${BEAN_ORDER_CARD} mb-4 p-4`}>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-xs text-muted-foreground">รายการ</h2>
          <p className="tabular-nums text-base text-foreground">{formatBaht(order.totalBaht)} ฿</p>
        </div>
        <ul className="divide-y divide-border text-sm">
          {order.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="min-w-0 truncate">
                {line.itemName} / {line.weightValue}
                {line.weightUnit === 'g' ? ' ก.' : ' กก.'}
              </span>
              <span className="shrink-0 tabular-nums">{formatBaht(line.lineTotalBaht)} ฿</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground sm:text-sm">
          <p className="flex justify-between gap-2 sm:block">
            <span>รวมสินค้า</span>
            <span className="tabular-nums text-foreground sm:float-right">{formatBaht(order.subtotalBaht)} ฿</span>
          </p>
          <p className="flex justify-between gap-2 sm:block">
            <span>ส่วนลด</span>
            <span className="tabular-nums text-foreground sm:float-right">-{formatBaht(order.discountBaht)} ฿</span>
          </p>
          <p className="flex justify-between gap-2 sm:block">
            <span>ค่าส่ง</span>
            <span className="tabular-nums text-foreground sm:float-right">{formatBaht(order.shippingBaht)} ฿</span>
          </p>
        </div>
        {order.notes ? (
          <p className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
            หมายเหตุ: <span className="text-foreground">{order.notes}</span>
          </p>
        ) : null}
      </section>

      {!cancelled && (
        <>
          <section className={`${BEAN_ORDER_CARD} mb-4 p-4`}>
            <div
              className={cn(
                BEAN_ORDER_PAYMENT_SHIPPING_GRID,
                !(canEditShipping && !isReadOnly) && 'lg:grid-cols-1',
              )}
            >
              <div className={BEAN_ORDER_PAYMENT_COLUMN}>
                <h2 className="text-sm text-muted-foreground">ชำระเงิน</h2>
                {order.payment?.confirmedAt ? (
                  <p className="text-xs text-muted-foreground">
                    ยืนยันชำระแล้ว
                    {order.payment.confirmedBy ? ` / ${order.payment.confirmedBy}` : ''}
                  </p>
                ) : null}
                <div className={BEAN_ORDER_PAYMENT_BODY}>
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
                          disabled={busy}
                          onClick={() => void handleConfirmPayment()}
                          className={cn(
                            BEAN_ORDER_ACTION_BTN_CONFIRM,
                            'h-auto min-h-11 w-full px-3 py-2 text-center text-xs leading-snug sm:text-sm',
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
                  <div className={BEAN_ORDER_PAYMENT_SLIP_SLOT}>
                    {hasSlip ? (
                      <PaymentSlipViewer
                        orderId={order.id}
                        slipUrl={order.payment?.slipUrl ?? null}
                        uploadedAt={order.payment?.uploadedAt}
                        variant="panel"
                      />
                    ) : (
                      <div className="flex h-full min-h-[9rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-4 text-sm text-muted-foreground">
                        ยังไม่มีสลิป
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {canEditShipping && !isReadOnly ? (
                <div className={BEAN_ORDER_SHIPPING_COLUMN}>
                  <h2 className="text-sm text-muted-foreground">จัดส่ง</h2>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      {carrierCode === OTHER_CARRIER_CODE ? (
                        <div className={cn('relative sm:min-w-[9rem] sm:flex-1')}>
                          <input
                            className={cn(inputClass, 'w-full pr-10')}
                            value={customCarrierLabel}
                            onChange={(e) => setCustomCarrierLabel(e.target.value)}
                            placeholder="อื่นๆ"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
                            aria-label="เลือกช่องทางจัดส่ง"
                            onClick={() => {
                              setCarrierCode('kerryexpress-th');
                              setCustomCarrierLabel('');
                            }}
                          >
                            <ChevronDown className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      ) : (
                        <BeanOrderSelect
                          wrapperClassName="sm:min-w-[9rem] sm:flex-1"
                          value={carrierCode}
                          onChange={(e) => {
                            const next = e.target.value;
                            setCarrierCode(next);
                            if (next === OTHER_CARRIER_CODE) {
                              setCustomCarrierLabel('');
                            }
                          }}
                        >
                          {BEAN_ORDER_CARRIERS.map((c) => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                          ))}
                        </BeanOrderSelect>
                      )}
                      <input
                        className={cn(inputClass, 'sm:min-w-[10rem] sm:flex-[1.5]')}
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="เลขพัสดุ (ไม่บังคับ)"
                      />
                    </div>
                    {canManualDeliver ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleConfirmDelivered()}
                        className={cn(
                          BEAN_ORDER_ACTION_BTN_CONFIRM,
                          'h-auto min-h-11 w-full px-3 py-2 text-center text-xs leading-snug sm:text-sm',
                        )}
                      >
                        ยืนยันจัดส่งแล้ว
                      </button>
                    ) : null}
                    <div className="flex justify-end">
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

          {canCancel && !isReadOnly ? (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCancel()}
                className={BEAN_ORDER_ACTION_BTN_DANGER}
              >
                ยกเลิกออเดอร์
              </button>
            </div>
          ) : null}
        </>
      )}

      {order.shipment && (
        <section className={`${BEAN_ORDER_CARD} mb-4`}>
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <h2 className="text-xs text-muted-foreground">การจัดส่ง</h2>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-foreground">
                    {getCarrierLabel(order.shipment.carrierCode)}
                  </span>
                </div>
                {order.shipment.trackingNumber ? (
                  <p className="text-xs text-muted-foreground">
                    พัสดุ <span className="text-foreground">{order.shipment.trackingNumber}</span>
                    {shipmentTrackingLabel ? <span> / {shipmentTrackingLabel}</span> : null}
                  </p>
                ) : null}
              </div>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="border-t border-border px-4 pb-4 pt-3 text-sm">
              <TrackingTimeline
                trackingNumber={order.shipment.trackingNumber}
                trackingStatus={order.shipment.trackingStatus}
                fulfillmentStatus={order.fulfillmentStatus}
                events={order.shipment.trackingEvents}
              />
            </div>
          </details>
        </section>
      )}

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
