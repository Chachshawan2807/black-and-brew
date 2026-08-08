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
  return getCarrierLabel(order.carrierCode);
}

type CopyToast = {
  message: string;
  x: number;
  y: number;
  type: 'success' | 'error';
};

const DETAIL_LINK_PROPS = {
  prefetch: true,
  'data-bb-nav': 'instant',
} as const;

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
        'bb-row-interactive relative flex items-start gap-1 lg:grid lg:grid-cols-subgrid lg:col-span-full lg:items-center lg:gap-x-0',
        BEAN_ORDER_LIST_ROW,
      )}
    >
      <button
        type="button"
        onClick={(event) => void handleCopy(event)}
        className={cn(
          'mt-3 ml-1 h-11 w-11 shrink-0 text-muted-foreground lg:col-start-1 lg:mt-0 lg:ml-0 lg:h-9 lg:w-9',
          BEAN_ORDER_BTN_ICON,
          BEAN_ORDER_LIST_CELL,
          'lg:flex lg:items-center lg:justify-center',
        )}
        aria-label="คัดลอกรายละเอียดออเดอร์"
        title="คัดลอกรายละเอียด"
      >
        <Copy className="h-4 w-4" aria-hidden />
      </button>

      <Link
        href={detailHref}
        {...DETAIL_LINK_PROPS}
        onTouchStart={warmDetailRoute}
        onMouseEnter={warmDetailRoute}
        onFocus={warmDetailRoute}
        className="min-w-0 flex-1 touch-manipulation rounded-xl py-3 pr-3 bb-transition hover:bg-muted/25 lg:contents lg:p-0"
      >
        <div className="lg:hidden">
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
            <p className="tabular-nums text-sm text-foreground">{formatBaht(order.totalBaht)}</p>
            <OrderListStatusGroup
              slipUploadedAt={order.slipUploadedAt}
              paymentStatus={order.paymentStatus}
              trackingStatus={order.trackingStatus}
              cancelledAt={order.cancelledAt}
            />
          </div>
        </div>

        <p
          className={cn('hidden min-w-0 truncate text-sm text-foreground/90 lg:col-start-2 lg:block', BEAN_ORDER_LIST_CELL)}
          title={customerLabel}
        >
          {customerLabel}
        </p>

        <div className={cn('hidden min-w-0 lg:col-start-3 lg:block', BEAN_ORDER_LIST_CELL)}>
          <p className="truncate text-sm text-foreground">{order.orderNo}</p>
          <p className="truncate text-xs tabular-nums text-muted-foreground">{formatListDate(order.createdAt)}</p>
        </div>

        <p
          className={cn(
            'hidden min-w-0 truncate text-xs leading-snug text-muted-foreground lg:col-start-4 lg:block',
            BEAN_ORDER_LIST_CELL,
          )}
          title={destinationLine}
        >
          {destinationLine}
        </p>

        <p
          className={cn(
            'hidden min-w-0 truncate text-xs leading-snug text-muted-foreground lg:col-start-5 lg:block',
            BEAN_ORDER_LIST_CELL,
          )}
          title={shippingChannel}
        >
          {shippingChannel}
        </p>

        <p
          className={cn(
            'hidden whitespace-nowrap text-right tabular-nums text-sm text-foreground lg:col-start-6 lg:block',
            BEAN_ORDER_LIST_CELL,
          )}
        >
          {formatBaht(order.totalBaht)}
        </p>

        <div className={cn('hidden min-w-0 justify-end lg:col-start-7 lg:flex', BEAN_ORDER_LIST_CELL)}>
          <OrderListStatusGroup
            slipUploadedAt={order.slipUploadedAt}
            paymentStatus={order.paymentStatus}
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
