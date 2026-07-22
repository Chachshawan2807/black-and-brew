'use client';

import { cn } from '@/lib/utils';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import { getOrderStatusLabel } from '@/lib/bean-orders/order-status';

type StatusBadgeProps = {
  paymentStatus: 'unpaid' | 'paid';
  fulfillmentStatus: 'pending' | 'shipped';
  cancelledAt?: string | null;
  className?: string;
};

type TrackingStatusBadgeProps = {
  label: string;
  className?: string;
};

type OrderListStatusGroupProps = StatusBadgeProps & {
  latestTrackingLabel?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  'รอชำระ': 'bg-[#fff3dd]',
  'ชำระแล้ว / รอจัดส่ง': 'bg-[#e8f5e9]',
  'จัดส่งแล้ว / รอชำระ': 'bg-[#e3f2fd]',
  'เสร็จสมบูรณ์': 'bg-[#dcedc8]',
  'ยกเลิก': 'bg-[#ffebee]',
};

const TRACKING_STATUS_COLORS: Record<string, string> = {
  จัดส่งสำเร็จ: 'bg-[#e8f5e9]',
};

export function OrderStatusBadge({ paymentStatus, fulfillmentStatus, cancelledAt, className }: StatusBadgeProps) {
  const label = getOrderStatusLabel(paymentStatus, fulfillmentStatus, cancelledAt);
  return (
    <span
      className={cn(
        PASTEL_SURFACE,
        'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-normal border border-black/10',
        STATUS_COLORS[label] ?? 'bg-card',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function TrackingStatusBadge({ label, className }: TrackingStatusBadgeProps) {
  return (
    <span
      className={cn(
        PASTEL_SURFACE,
        'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-normal border border-black/10',
        TRACKING_STATUS_COLORS[label] ?? 'bg-[#e3f2fd]',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function OrderListStatusGroup({
  paymentStatus,
  fulfillmentStatus,
  cancelledAt,
  latestTrackingLabel,
  className,
}: OrderListStatusGroupProps) {
  return (
    <div className={cn('flex flex-col items-end gap-1 lg:flex-row lg:items-center lg:justify-end lg:gap-2', className)}>
      <OrderStatusBadge
        paymentStatus={paymentStatus}
        fulfillmentStatus={fulfillmentStatus}
        cancelledAt={cancelledAt}
      />
      {latestTrackingLabel ? <TrackingStatusBadge label={latestTrackingLabel} /> : null}
    </div>
  );
}
