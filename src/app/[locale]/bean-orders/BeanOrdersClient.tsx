'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import { BeanOrderListItem } from './_components/BeanOrderListItem';
import { BEAN_ORDER_CARD, BEAN_ORDER_INPUT, BEAN_ORDER_LIST_GRID, BEAN_ORDER_PAGE } from './_components/bean-order-layout';

type Props = {
  initialOrders: BeanOrderListRow[];
  locale: string;
};

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
    <div className={BEAN_ORDER_PAGE}>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-normal text-foreground">คำสั่งซื้อเมล็ดกาแฟ</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">รับออเดอร์ · ตรวจสลิป · จัดส่ง</p>
        </div>
        <Link
          href={`/${locale}/bean-orders/new`}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm text-background"
        >
          <Plus className="h-4 w-4" aria-hidden /> สร้างออเดอร์
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => startTransition(() => setSearch(e.target.value))}
          placeholder="ค้นหาเลขออเดอร์ / ชื่อลูกค้า"
          className={BEAN_ORDER_INPUT}
        />
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
          className={BEAN_ORDER_INPUT}
        >
          <option value="all">ชำระเงิน: ทั้งหมด</option>
          <option value="unpaid">ยังไม่ชำระ</option>
          <option value="paid">ชำระแล้ว</option>
        </select>
        <select
          value={fulfillmentFilter}
          onChange={(e) => setFulfillmentFilter(e.target.value as typeof fulfillmentFilter)}
          className={BEAN_ORDER_INPUT}
        >
          <option value="all">จัดส่ง: ทั้งหมด</option>
          <option value="pending">ยังไม่ส่ง</option>
          <option value="shipped">ส่งแล้ว</option>
        </select>
      </div>

      <div className={`${BEAN_ORDER_CARD} overflow-hidden`}>
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">ไม่พบออเดอร์</p>
        ) : (
          <>
            <div
              className={`hidden border-b border-border px-4 py-2 text-xs text-muted-foreground lg:grid ${BEAN_ORDER_LIST_GRID} lg:gap-x-4`}
              aria-hidden
            >
              <span />
              <span>ลูกค้า</span>
              <span>หมายเลขคำสั่งซื้อ</span>
              <span>ปลายทาง · สถานะจัดส่ง</span>
              <span>ช่องทางจัดส่ง</span>
              <span className="text-right">ยอด</span>
              <span className="text-right">สถานะ</span>
            </div>
            <ul className="divide-y divide-border">
              {filtered.map((order) => (
                <BeanOrderListItem key={order.id} order={order} locale={locale} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
