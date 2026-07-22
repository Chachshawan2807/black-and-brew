'use client';

import { cn } from '@/lib/utils';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import { getOrderStatusLabel } from '@/lib/bean-orders/order-status';

type Props = {
  paymentStatus: 'unpaid' | 'paid';
  fulfillmentStatus: 'pending' | 'shipped';
  cancelledAt?: string | null;
  className?: string;
};

const STATUS_COLORS: Record<string, string> = {
  'รอชำระ': 'bg-[#fff3dd]',
  'ชำระแล้ว · รอจัดส่ง': 'bg-[#e8f5e9]',
  'จัดส่งแล้ว · รอชำระ': 'bg-[#e3f2fd]',
  'เสร็จสมบูรณ์': 'bg-[#dcedc8]',
  'ยกเลิก': 'bg-[#ffebee]',
};

export function OrderStatusBadge({ paymentStatus, fulfillmentStatus, cancelledAt, className }: Props) {
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
