'use client';

import { cn } from '@/lib/utils';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import {
  ORDER_DELIVERY_BADGE_LABEL,
  ORDER_PAYMENT_BADGE_LABEL,
  shouldShowOrderDeliveryBadge,
  shouldShowOrderPaymentBadge,
} from '@/lib/bean-orders/order-status';

type OrderListStatusGroupProps = {
  slipUploadedAt?: string | null;
  trackingStatus?: string | null;
  cancelledAt?: string | null;
  className?: string;
};

const PAYMENT_BADGE_COLOR = 'bg-[#e8f5e9]';
const DELIVERY_BADGE_COLOR = 'bg-[#e3f2fd]';

function StatusBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={cn(
        PASTEL_SURFACE,
        'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-normal border border-black/10',
        colorClass,
      )}
    >
      {label}
    </span>
  );
}

export function OrderListStatusGroup({
  slipUploadedAt,
  trackingStatus,
  cancelledAt,
  className,
}: OrderListStatusGroupProps) {
  const showPayment = shouldShowOrderPaymentBadge(slipUploadedAt, cancelledAt);
  const showDelivery = shouldShowOrderDeliveryBadge(trackingStatus, cancelledAt);

  if (!showPayment && !showDelivery) {
    return null;
  }

  return (
    <div className={cn('flex flex-col items-end gap-1 lg:flex-row lg:items-center lg:justify-end lg:gap-2', className)}>
      {showPayment ? (
        <StatusBadge label={ORDER_PAYMENT_BADGE_LABEL} colorClass={PAYMENT_BADGE_COLOR} />
      ) : null}
      {showDelivery ? (
        <StatusBadge label={ORDER_DELIVERY_BADGE_LABEL} colorClass={DELIVERY_BADGE_COLOR} />
      ) : null}
    </div>
  );
}
