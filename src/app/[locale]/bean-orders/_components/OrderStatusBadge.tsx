'use client';

import { cn } from '@/lib/utils';
import { Banknote, ICON_STROKE, Truck } from '@/lib/icons';
import { PASTEL_SURFACE, BEAN_ORDER_BADGE_COLORS } from '@/lib/shift-colors';
import {
  ORDER_DELIVERY_BADGE_LABEL,
  ORDER_PAYMENT_BADGE_LABEL,
  shouldShowOrderDeliveryBadge,
  shouldShowOrderPaymentBadge,
} from '@/lib/bean-orders/order-status';

type OrderListStatusGroupProps = {
  slipUploadedAt?: string | null;
  paymentStatus?: 'unpaid' | 'paid';
  trackingStatus?: string | null;
  cancelledAt?: string | null;
  className?: string;
};

const PAYMENT_BADGE_COLOR = BEAN_ORDER_BADGE_COLORS.payment;
const DELIVERY_BADGE_COLOR = BEAN_ORDER_BADGE_COLORS.delivery;

function StatusBadge({
  label,
  colorClass,
  icon,
}: {
  label: string;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        PASTEL_SURFACE,
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-black/10 px-2.5 py-1 text-xs font-normal bb-transition duration-200',
        colorClass,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export function OrderListStatusGroup({
  slipUploadedAt,
  paymentStatus,
  trackingStatus,
  cancelledAt,
  className,
}: OrderListStatusGroupProps) {
  const showPayment = shouldShowOrderPaymentBadge(slipUploadedAt, paymentStatus, cancelledAt);
  const showDelivery = shouldShowOrderDeliveryBadge(trackingStatus, cancelledAt);

  if (!showPayment && !showDelivery) {
    return null;
  }

  return (
    <div className={cn('flex flex-col items-end gap-1 lg:flex-row lg:items-center lg:justify-end lg:gap-2', className)}>
      {showPayment ? (
        <StatusBadge
          label={ORDER_PAYMENT_BADGE_LABEL}
          colorClass={PAYMENT_BADGE_COLOR}
          icon={<Banknote className="h-3 w-3 shrink-0 opacity-80" strokeWidth={ICON_STROKE} aria-hidden />}
        />
      ) : null}
      {showDelivery ? (
        <StatusBadge
          label={ORDER_DELIVERY_BADGE_LABEL}
          colorClass={DELIVERY_BADGE_COLOR}
          icon={<Truck className="h-3 w-3 shrink-0 opacity-80" strokeWidth={ICON_STROKE} aria-hidden />}
        />
      ) : null}
    </div>
  );
}
