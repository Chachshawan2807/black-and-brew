'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { FloatingAlert } from '@/components/ui/floating-alert';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import { formatOrderDeliveryDestination } from '@/lib/bean-orders/address';
import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import { getCarrierLabel } from '@/lib/bean-orders/carriers';
import { formatBeanOrderShareText } from '@/lib/bean-orders/order-share-text';
import { preloadRouteChunk } from '@/lib/route-chunk-preload';
import { OrderListStatusGroup } from './OrderStatusBadge';
import { BEAN_ORDER_BTN_ICON, BEAN_ORDER_LIST_CELL, BEAN_ORDER_LIST_ROW } from './bean-order-layout';
import { cn } from '@/lib/utils';

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
  return formatOrderDeliveryDestination(order);
}

function formatShippingChannel(order: BeanOrderListRow): string {
  if (order.fulfillmentStatus !== 'shipped') {
    return '—';
  }

  return getCarrierLabel(order.carrierCode);
}

type CopyToast = {
  message: string;
  x: number;
  y: number;
  type: 'success' | 'error';
};

export function BeanOrderListItem({ order, locale }: Props) {
  const [copyToast, setCopyToast] = useState<CopyToast | null>(null);
  const customerLabel = formatCustomerLabel(order);
  const destinationLine = formatDestinationLine(order);
  const shippingChannel = formatShippingChannel(order);
  const detailHref = `/${locale}/bean-orders/${order.id}`;

  function warmDetailRoute() {
    preloadRouteChunk(detailHref);
  }

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const anchor = { x: event.clientX, y: event.clientY };

    try {
      await navigator.clipboard.writeText(formatBeanOrderShareText(order));
      setCopyToast({ message: 'คัดลอกแล้ว', ...anchor, type: 'success' });
    } catch {
      setCopyToast({ message: 'คัดลอกไม่สำเร็จ', ...anchor, type: 'error' });
    }
  }

  return (
    <li
      className={cn(
        'bb-row-interactive relative lg:grid lg:grid-cols-subgrid lg:col-span-full lg:items-center lg:gap-x-0',
        BEAN_ORDER_LIST_ROW,
      )}
    >
      <div className={cn('lg:col-start-1 lg:flex lg:items-center lg:justify-center', BEAN_ORDER_LIST_CELL)}>
        <button
          type="button"
          onClick={(event) => void handleCopy(event)}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={`absolute left-3 top-3 z-10 h-9 w-9 shrink-0 text-muted-foreground sm:left-4 lg:static ${BEAN_ORDER_BTN_ICON}`}
          aria-label="คัดลอกรายละเอียดออเดอร์"
          title="คัดลอกรายละเอียด"
        >
          <Copy className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <Link
        href={detailHref}
        prefetch
        onTouchStart={warmDetailRoute}
        onMouseEnter={warmDetailRoute}
        onFocus={warmDetailRoute}
        className="block rounded-xl py-3 pl-14 pr-3 bb-transition hover:bg-muted/25 sm:pl-14 sm:pr-4 lg:hidden"
      >
        <p className="min-w-0 truncate text-sm text-foreground/90" title={customerLabel}>
          {customerLabel}
        </p>

        <div className="mt-1 min-w-0">
          <p className="truncate text-sm text-foreground">{order.orderNo}</p>
          <p className="truncate text-xs tabular-nums text-muted-foreground">{formatListDate(order.createdAt)}</p>
        </div>

        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{destinationLine}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{shippingChannel}</p>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="tabular-nums text-sm text-foreground">{formatBaht(order.totalBaht)} ฿</p>
          <OrderListStatusGroup
            slipUploadedAt={order.slipUploadedAt}
            trackingStatus={order.trackingStatus}
            cancelledAt={order.cancelledAt}
          />
        </div>
      </Link>

      <Link
        href={detailHref}
        prefetch
        onTouchStart={warmDetailRoute}
        onMouseEnter={warmDetailRoute}
        onFocus={warmDetailRoute}
        className="hidden lg:contents"
      >
        <p
          className={cn('min-w-0 truncate text-sm text-foreground/90 lg:col-start-2', BEAN_ORDER_LIST_CELL)}
          title={customerLabel}
        >
          {customerLabel}
        </p>

        <div className={cn('min-w-0 lg:col-start-3', BEAN_ORDER_LIST_CELL)}>
          <p className="truncate text-sm text-foreground">{order.orderNo}</p>
          <p className="truncate text-xs tabular-nums text-muted-foreground">{formatListDate(order.createdAt)}</p>
        </div>

        <p
          className={cn('min-w-0 truncate text-xs leading-snug text-muted-foreground lg:col-start-4', BEAN_ORDER_LIST_CELL)}
          title={destinationLine}
        >
          {destinationLine}
        </p>

        <p
          className={cn('min-w-0 truncate text-xs leading-snug text-muted-foreground lg:col-start-5', BEAN_ORDER_LIST_CELL)}
          title={shippingChannel}
        >
          {shippingChannel}
        </p>

        <p
          className={cn(
            'whitespace-nowrap text-right tabular-nums text-sm text-foreground lg:col-start-6',
            BEAN_ORDER_LIST_CELL,
          )}
        >
          {formatBaht(order.totalBaht)} ฿
        </p>

        <div className={cn('min-w-0 flex justify-end lg:col-start-7', BEAN_ORDER_LIST_CELL)}>
          <OrderListStatusGroup
            slipUploadedAt={order.slipUploadedAt}
            trackingStatus={order.trackingStatus}
            cancelledAt={order.cancelledAt}
          />
        </div>
      </Link>

      {copyToast ? (
        <FloatingAlert
          message={copyToast.message}
          anchor={{ x: copyToast.x, y: copyToast.y }}
          icon={
            copyToast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
            )
          }
          onDismiss={() => setCopyToast(null)}
        />
      ) : null}
    </li>
  );
}
