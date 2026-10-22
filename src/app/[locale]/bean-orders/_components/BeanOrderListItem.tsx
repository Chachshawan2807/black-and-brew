'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle, Check, Copy } from '@/lib/icons';
import { FloatingAlert } from '@/components/ui/floating-alert';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import { formatOrderDeliveryDestination } from '@/lib/bean-orders/address';
import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import { getCarrierLabel } from '@/lib/bean-orders/carriers';
import { formatBeanOrderShareText } from '@/lib/bean-orders/order-share-text';
import { warmRouteNavigation } from '@/lib/warm-route-navigation';
import { OrderListStatusGroup } from './OrderStatusBadge';
import { BEAN_ORDER_LIST_CELL, BEAN_ORDER_LIST_ROW } from './bean-order-layout';
import { BeanOrderIconButton, BeanOrderListRowMotion } from './bean-order-ui-primitives';
import { useBeanOrderCopyFeedback } from './use-bean-order-copy-feedback';
import { cn } from '@/lib/utils';

type Props = {
  order: BeanOrderListRow;
  locale: string;
  embedded?: boolean;
  onOpenOrder?: (orderId: string) => void;
  index?: number;
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
  type: 'error';
};

const DETAIL_LINK_PROPS = {
  prefetch: false,
  'data-bb-nav': 'instant',
} as const;

export function BeanOrderListItem({ order, locale, embedded = false, onOpenOrder, index = 0 }: Props) {
  const router = useRouter();
  const [copyToast, setCopyToast] = useState<CopyToast | null>(null);
  const copyFeedback = useBeanOrderCopyFeedback();
  const customerLabel = formatCustomerLabel(order);
  const destinationLine = formatDestinationLine(order);
  const shippingChannel = formatShippingChannel(order);
  const detailHref = `/${locale}/bean-orders/${order.id}`;

  function warmDetailRoute() {
    warmRouteNavigation(detailHref, router.prefetch);
  }

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(formatBeanOrderShareText(order));
      setCopyToast(null);
      copyFeedback.showCopied();
    } catch {
      copyFeedback.showError();
      setCopyToast({ message: 'คัดลอกไม่สำเร็จ', x: event.clientX, y: event.clientY, type: 'error' });
    }
  }

  const rowContent = (
    <>
      <div className="lg:hidden">
        <p className="min-w-0 truncate text-sm text-foreground/90" title={customerLabel}>
          <span className="sr-only">ลูกค้า: </span>
          {customerLabel}
        </p>

        <div className="mt-1 min-w-0">
          <p className="truncate text-sm text-foreground">
            <span className="sr-only">หมายเลขออเดอร์: </span>
            {order.orderNo}
          </p>
          <p className="truncate text-xs tabular-nums text-muted-foreground">{formatListDate(order.createdAt)}</p>
        </div>

        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          <span className="sr-only">ปลายทาง: </span>
          {destinationLine}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          <span className="sr-only">ช่องทางจัดส่ง: </span>
          {shippingChannel}
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="tabular-nums text-sm text-foreground">
            <span className="sr-only">ยอดรวม: </span>
            {formatBaht(order.totalBaht)}
          </p>
          <span className="sr-only">สถานะ: </span>
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
        <span className="sr-only">ลูกค้า: </span>
        {customerLabel}
      </p>

      <div className={cn('hidden min-w-0 lg:col-start-3 lg:block', BEAN_ORDER_LIST_CELL)}>
        <p className="truncate text-sm text-foreground">
          <span className="sr-only">หมายเลขออเดอร์: </span>
          {order.orderNo}
        </p>
        <p className="truncate text-xs tabular-nums text-muted-foreground">{formatListDate(order.createdAt)}</p>
      </div>

      <p
        className={cn(
          'hidden min-w-0 truncate text-xs leading-snug text-muted-foreground lg:col-start-4 lg:block',
          BEAN_ORDER_LIST_CELL,
        )}
        title={destinationLine}
      >
        <span className="sr-only">ปลายทาง: </span>
        {destinationLine}
      </p>

      <p
        className={cn(
          'hidden min-w-0 truncate text-xs leading-snug text-muted-foreground lg:col-start-5 lg:block',
          BEAN_ORDER_LIST_CELL,
        )}
        title={shippingChannel}
      >
        <span className="sr-only">ช่องทางจัดส่ง: </span>
        {shippingChannel}
      </p>

      <p
        className={cn(
          'hidden whitespace-nowrap text-right tabular-nums text-sm text-foreground lg:col-start-6 lg:block',
          BEAN_ORDER_LIST_CELL,
        )}
      >
        <span className="sr-only">ยอดรวม: </span>
        {formatBaht(order.totalBaht)}
      </p>

      <div className={cn('hidden min-w-0 justify-end lg:col-start-7 lg:flex', BEAN_ORDER_LIST_CELL)}>
        <span className="sr-only">สถานะ: </span>
        <OrderListStatusGroup
          slipUploadedAt={order.slipUploadedAt}
          paymentStatus={order.paymentStatus}
          trackingStatus={order.trackingStatus}
          cancelledAt={order.cancelledAt}
        />
      </div>
    </>
  );

  const rowClassName =
    'min-w-0 flex-1 touch-manipulation rounded-xl py-3 pr-3 bb-transition hover:bg-muted/25 active:bg-muted/35 lg:contents lg:p-0';

  return (
    <BeanOrderListRowMotion
      index={index}
      className={cn(
        'bb-row-interactive relative flex items-start gap-1 lg:grid lg:grid-cols-subgrid lg:col-span-full lg:items-center lg:gap-x-0',
        BEAN_ORDER_LIST_ROW,
      )}
    >
      <BeanOrderIconButton
        onClick={(event) => void handleCopy(event)}
        label={copyFeedback.status === 'copied' ? 'คัดลอกแล้ว' : 'คัดลอกรายละเอียดออเดอร์'}
        className={cn(
          'mt-3 ml-1 h-11 w-11 shrink-0 text-muted-foreground lg:col-start-1 lg:mt-0 lg:ml-0 lg:h-9 lg:w-9',
          BEAN_ORDER_LIST_CELL,
          'lg:flex lg:items-center lg:justify-center lg:!px-0',
        )}
      >
        <span className="relative inline-grid h-4 w-4 shrink-0 place-items-center" aria-hidden>
          <Copy
            className={`absolute h-4 w-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${copyFeedback.status === 'copied' ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}
          />
          <Check
            className={`absolute h-4 w-4 text-emerald-600 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${copyFeedback.status === 'copied' ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
          />
        </span>
        <span className="sr-only" aria-live="polite">
          {copyFeedback.status === 'copied' ? 'คัดลอกแล้ว' : copyFeedback.status === 'error' ? 'คัดลอกไม่สำเร็จ' : ''}
        </span>
      </BeanOrderIconButton>

      {embedded && onOpenOrder ? (
        <button
          type="button"
          onClick={() => onOpenOrder(order.id)}
          className={cn(rowClassName, 'text-left')}
        >
          {rowContent}
        </button>
      ) : (
        <Link
          href={detailHref}
          {...DETAIL_LINK_PROPS}
          onPointerDown={(event) => {
            if (event.button === 0) {
              warmDetailRoute();
            }
          }}
          onTouchStart={warmDetailRoute}
          onMouseEnter={warmDetailRoute}
          onFocus={warmDetailRoute}
          className={rowClassName}
        >
          {rowContent}
        </Link>
      )}

      {copyToast ? (
        <FloatingAlert
          message={copyToast.message}
          anchor={{ x: copyToast.x, y: copyToast.y }}
          icon={<AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />}
          onDismiss={() => setCopyToast(null)}
        />
      ) : null}
    </BeanOrderListRowMotion>
  );
}
