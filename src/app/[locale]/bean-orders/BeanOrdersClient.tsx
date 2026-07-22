'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import { OrderStatusBadge } from './_components/OrderStatusBadge';

type Props = {
  initialOrders: BeanOrderListRow[];
  locale: string;
};

function formatBaht(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function BeanOrdersClient({ initialOrders, locale }: Props) {
  const [orders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | 'pending' | 'shipped'>('all');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter) return false;
      if (fulfillmentFilter !== 'all' && order.fulfillmentStatus !== fulfillmentFilter) return false;
      if (!q) return true;
      return (
        order.orderNo.toLowerCase().includes(q) ||
        order.recipientName.toLowerCase().includes(q) ||
        (order.customerName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [orders, search, paymentFilter, fulfillmentFilter]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-normal text-foreground">คำสั่งซื้อเมล็ดกาแฟ</h1>
          <p className="text-sm text-muted-foreground mt-1">รับออเดอร์ · ตรวจสลิป · จัดส่ง</p>
        </div>
        <Link
          href={`/${locale}/bean-orders/new`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm text-background"
        >
          <Plus className="h-4 w-4" /> สร้างออเดอร์
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          type="search"
          value={search}
          onChange={(e) => startTransition(() => setSearch(e.target.value))}
          placeholder="ค้นหาเลขออเดอร์ / ชื่อผู้รับ"
          className="h-11 flex-1 min-w-[200px] rounded-xl border border-border bg-background px-3 text-sm"
        />
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="all">ชำระเงิน: ทั้งหมด</option>
          <option value="unpaid">ยังไม่ชำระ</option>
          <option value="paid">ชำระแล้ว</option>
        </select>
        <select
          value={fulfillmentFilter}
          onChange={(e) => setFulfillmentFilter(e.target.value as typeof fulfillmentFilter)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="all">จัดส่ง: ทั้งหมด</option>
          <option value="pending">ยังไม่ส่ง</option>
          <option value="shipped">ส่งแล้ว</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">ไม่พบออเดอร์</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/${locale}/bean-orders/${order.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-normal text-foreground">{order.orderNo}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.customerName ? `${order.customerName} → ` : ''}
                      {order.recipientName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="tabular-nums text-sm">{formatBaht(order.totalBaht)} ฿</span>
                    <OrderStatusBadge
                      paymentStatus={order.paymentStatus}
                      fulfillmentStatus={order.fulfillmentStatus}
                      cancelledAt={order.cancelledAt}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
