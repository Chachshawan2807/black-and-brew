'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  cancelBeanOrder,
  confirmBeanOrderPayment,
  shipBeanOrder,
  uploadBeanOrderSlip,
  type BeanOrderDetail,
} from '@/app/actions/bean-order-actions';
import { BEAN_ORDER_CARRIERS, getCarrierLabel } from '@/lib/bean-orders/carriers';
import { mapTrackingStatusLabel } from '@/lib/bean-orders/trackingmore';
import { canCancelOrder, canConfirmPayment, canShip, canUploadSlip } from '@/lib/bean-orders/order-status';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';
import { OrderStatusBadge } from './_components/OrderStatusBadge';
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

  const [deliveryType, setDeliveryType] = useState<'parcel' | 'same_day'>(
    order.shipment?.deliveryType ?? 'parcel',
  );
  const [carrierCode, setCarrierCode] = useState(order.shipment?.carrierCode ?? 'kerry-logistics');
  const [trackingNumber, setTrackingNumber] = useState(order.shipment?.trackingNumber ?? '');

  const cancelled = Boolean(order.cancelledAt);
  const canPay = canUploadSlip(order.paymentStatus, order.cancelledAt);
  const canConfirm = canConfirmPayment(order.paymentStatus, order.cancelledAt);
  const canShipOrder = canShip(order.fulfillmentStatus, order.cancelledAt);
  const canCancel = canCancelOrder(order.fulfillmentStatus, order.cancelledAt);

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
    setMessage('อัปโหลดสลิปแล้ว');
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

  async function handleShip() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    setBusy(true);
    const result = await shipBeanOrder(order.id, { deliveryType, carrierCode, trackingNumber }, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'บันทึกจัดส่งไม่สำเร็จ'); return; }
    setOrder((prev) => ({ ...prev, fulfillmentStatus: 'shipped' }));
    if (result.trackingWarning) setMessage(`จัดส่งแล้ว (ติดตามพัสดุ: ${result.trackingWarning})`);
    else setMessage('บันทึกจัดส่งแล้ว');
    await reload();
  }

  async function handleCancel() {
    if (isReadOnly) { setError(READ_ONLY_DENY_MSG); return; }
    if (!confirm('ยกเลิกออเดอร์นี้?')) return;
    setBusy(true);
    const result = await cancelBeanOrder(order.id, locale);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'ยกเลิกไม่สำเร็จ'); return; }
    await reload();
  }

  const inputClass =
    'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Link href={`/${locale}/bean-orders`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> กลับรายการ
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-normal">{order.orderNo}</h1>
        <OrderStatusBadge
          paymentStatus={order.paymentStatus}
          fulfillmentStatus={order.fulfillmentStatus}
          cancelledAt={order.cancelledAt}
        />
      </div>

      {message && <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-2 text-sm">
        <p><span className="text-muted-foreground">ลูกค้า:</span> {order.customerName ?? '—'}</p>
        <p><span className="text-muted-foreground">ผู้ส่ง:</span> {order.senderName} {order.senderPhone ? `· ${order.senderPhone}` : ''}</p>
        <p className="text-muted-foreground">{order.senderAddress}</p>
        <p className="pt-2"><span className="text-muted-foreground">ผู้รับ:</span> {order.recipientName} {order.recipientPhone ? `· ${order.recipientPhone}` : ''}</p>
        <p className="text-muted-foreground">{order.recipientAddress} {order.recipientProvince} {order.recipientPostalCode}</p>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm text-muted-foreground mb-2">รายการ</h2>
        <ul className="space-y-2 text-sm">
          {order.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-2">
              <span>{line.itemName} · {line.weightValue}{line.weightUnit === 'g' ? ' ก.' : ' กก.'}</span>
              <span className="tabular-nums">{formatBaht(line.lineTotalBaht)} ฿</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-border pt-3 text-sm space-y-1">
          <p className="flex justify-between"><span>รวมสินค้า</span><span>{formatBaht(order.subtotalBaht)} ฿</span></p>
          <p className="flex justify-between"><span>ส่วนลด</span><span>-{formatBaht(order.discountBaht)} ฿</span></p>
          <p className="flex justify-between"><span>ค่าส่ง</span><span>{formatBaht(order.shippingBaht)} ฿</span></p>
          <p className="flex justify-between text-base"><span>ยอดรวม</span><span>{formatBaht(order.totalBaht)} ฿</span></p>
        </div>
      </section>

      {!cancelled && (
        <>
          <section className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm text-muted-foreground">ชำระเงิน</h2>
            {order.payment?.slipUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.payment.slipUrl} alt="สลิปชำระเงิน" className="max-h-64 rounded-xl border border-border" />
            )}
            {canPay && !isReadOnly && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadSlip(file);
                }} />
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={cn(inputClass, 'text-center')}>
                  อัปโหลดสลิป
                </button>
              </>
            )}
            {canConfirm && !isReadOnly && (
              <button type="button" disabled={busy} onClick={() => void handleConfirmPayment()} className="h-11 w-full rounded-full bg-foreground text-background text-sm">
                ยืนยันชำระแล้ว
              </button>
            )}
          </section>

          {canShipOrder && !isReadOnly && (
            <section className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm text-muted-foreground">จัดส่ง</h2>
              <div className="flex gap-2">
                {(['parcel', 'same_day'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDeliveryType(type)}
                    className={cn('flex-1 h-10 rounded-full border text-sm', deliveryType === type ? 'bg-foreground text-background border-foreground' : 'border-border')}
                  >
                    {type === 'parcel' ? 'พัสดี' : 'ส่งในวัน'}
                  </button>
                ))}
              </div>
              <select className={inputClass} value={carrierCode} onChange={(e) => setCarrierCode(e.target.value)}>
                {BEAN_ORDER_CARRIERS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input className={inputClass} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="เลขพัสดุ (ไม่บังคับสำหรับส่งในวัน)" />
              <button type="button" disabled={busy} onClick={() => void handleShip()} className="h-11 w-full rounded-full bg-foreground text-background text-sm">
                บันทึกจัดส่งแล้ว
              </button>
            </section>
          )}

          {canCancel && !isReadOnly && (
            <button type="button" disabled={busy} onClick={() => void handleCancel()} className="text-sm text-red-600 underline">
              ยกเลิกออเดอร์
            </button>
          )}
        </>
      )}

      {order.shipment && (
        <section className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm space-y-1">
          <h2 className="text-sm text-muted-foreground mb-2">การจัดส่ง</h2>
          <p>ประเภท: {order.shipment.deliveryType === 'parcel' ? 'พัสดี' : 'ส่งในวัน'}</p>
          <p>ขนส่ง: {getCarrierLabel(order.shipment.carrierCode)}</p>
          <p>เลขพัสดุ: {order.shipment.trackingNumber ?? '—'}</p>
          {order.shipment.trackingStatus && (
            <p>สถานะ: {mapTrackingStatusLabel(order.shipment.trackingStatus)}</p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm text-muted-foreground mb-2">ประวัติ</h2>
        <ul className="space-y-2 text-sm">
          {order.statusHistory.length === 0 ? (
            <li className="text-muted-foreground">—</li>
          ) : (
            order.statusHistory.map((entry, i) => (
              <li key={`${entry.at}-${i}`}>
                {new Date(entry.at).toLocaleString('th-TH')} · {entry.action} · {entry.by}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
