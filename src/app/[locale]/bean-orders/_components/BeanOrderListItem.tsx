'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy } from 'lucide-react';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import { formatOrderDeliveryDestination } from '@/lib/bean-orders/address';
import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import { getCarrierLabel } from '@/lib/bean-orders/carriers';
import { getDeliveryTypeLabel } from '@/lib/bean-orders/delivery';
import { formatBeanOrderShareText } from '@/lib/bean-orders/order-share-text';
import { BEAN_ORDER_LIST_GRID } from './bean-order-layout';
import { OrderStatusBadge } from './OrderStatusBadge';

type Props = {
  order: BeanOrderListRow;
  locale: string;
};

function formatBaht(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatListDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCustomerLabel(order: BeanOrderListRow): string {
  return getBeanOrderCustomerDisplayName(order);
}

function formatDestinationLine(order: BeanOrderListRow): string {
  const destination = formatOrderDeliveryDestination(order);
  if (order.latestTrackingLabel) {
    return `${destination} · ${order.latestTrackingLabel}`;
  }
  return destination;
}

function formatShippingChannel(order: BeanOrderListRow): string {
  if (order.fulfillmentStatus !== 'shipped' || !order.deliveryType) {
    return '—';
  }

  if (order.deliveryType === 'same_day') {
    return getDeliveryTypeLabel(order.deliveryType);
  }

  return getCarrierLabel(order.carrierCode);
}

export function BeanOrderListItem({ order, locale }: Props) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const customerLabel = formatCustomerLabel(order);
  const destinationLine = formatDestinationLine(order);
  const shippingChannel = formatShippingChannel(order);

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(formatBeanOrderShareText(order));
      setCopyStatus('คัดลอกแล้ว');
    } catch {
      setCopyStatus('คัดลอกไม่สำเร็จ');
    }

    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  return (
    <li>
      <Link
        href={`/${locale}/bean-orders/${order.id}`}
        className={`block px-3 py-3 transition-colors hover:bg-muted/20 sm:px-4 lg:grid ${BEAN_ORDER_LIST_GRID} lg:items-center lg:gap-x-4 lg:py-3`}
      >
        <div className="flex items-start gap-2 lg:contents">
          <button
            type="button"
            onClick={(event) => void handleCopy(event)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground lg:col-start-1"
            aria-label="คัดลอกรายละเอียดออเดอร์"
            title="คัดลอกรายละเอียด"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </button>
          <p
            className="min-w-0 flex-1 truncate text-sm text-foreground/90 lg:col-start-2 lg:flex-none"
            title={customerLabel}
          >
            {customerLabel}
          </p>
        </div>

        <div className="mt-1 min-w-0 lg:col-start-3 lg:mt-0">
          <p className="truncate text-sm text-foreground">{order.orderNo}</p>
          <p className="truncate text-xs tabular-nums text-muted-foreground">{formatListDate(order.createdAt)}</p>
        </div>

        <p className="mt-0.5 text-xs leading-snug text-muted-foreground lg:col-start-4 lg:mt-0">
          {destinationLine}
        </p>

        <p className="mt-0.5 text-xs leading-snug text-muted-foreground lg:col-start-5 lg:mt-0">
          {shippingChannel}
        </p>

        <div className="mt-2 flex items-center justify-between gap-3 lg:contents">
          <p className="tabular-nums text-sm text-foreground lg:col-start-6 lg:mt-0 lg:text-right">
            {formatBaht(order.totalBaht)} ฿
          </p>
          <div className="shrink-0 lg:col-start-7 lg:flex lg:justify-end">
            <OrderStatusBadge
              paymentStatus={order.paymentStatus}
              fulfillmentStatus={order.fulfillmentStatus}
              cancelledAt={order.cancelledAt}
              className="whitespace-nowrap"
            />
          </div>
        </div>

        {copyStatus ? (
          <p className="mt-1 text-xs text-muted-foreground lg:col-span-full">{copyStatus}</p>
        ) : null}
      </Link>
    </li>
  );
}
