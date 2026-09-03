'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import { BeanOrderListItem } from './_components/BeanOrderListItem';
import { PageHeader } from '@/components/ui/page-header';
import { RoundedSelect } from '@/components/ui/rounded-select';
import {
  BEAN_ORDER_BTN_PRIMARY_LINK,
  BEAN_ORDER_INPUT,
  BEAN_ORDER_LIST_CARD,
  BEAN_ORDER_LIST_GRID,
  BEAN_ORDER_LIST_HEADER,
  BEAN_ORDER_LIST_CELL,
  BEAN_ORDER_PAGE,
} from './_components/bean-order-layout';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import { warmRouteNavigation } from '@/lib/warm-route-navigation';
import {
  applyBeanOrderDeliveredPatch,
  consumeBeanOrderDeliveredPatch,
} from '@/lib/bean-orders/delivered-notify-snapshot';

type Props = {
  initialOrders: BeanOrderListRow[];
  locale: string;
  embedded?: boolean;
  defaultPaymentFilter?: 'all' | 'unpaid' | 'paid';
  defaultFulfillmentFilter?: 'all' | 'pending' | 'shipped';
  onOpenOrder?: (orderId: string) => void;
};

export default function BeanOrdersClient({
  initialOrders,
  locale,
  embedded = false,
  defaultPaymentFilter = 'all',
  defaultFulfillmentFilter = 'all',
  onOpenOrder,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [orders, setOrders] = useState(initialOrders);
  const [prevOrdersSync, setPrevOrdersSync] = useState({ initialOrders, pathname });
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'unpaid' | 'paid'>(defaultPaymentFilter);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | 'pending' | 'shipped'>(
    defaultFulfillmentFilter,
  );
  const [message, setMessage] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const flash = sessionStorage.getItem('bb-bean-order-flash');
    if (flash) {
      sessionStorage.removeItem('bb-bean-order-flash');
      return flash;
    }
    return null;
  });
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [, startTransition] = useTransition();

  if (initialOrders !== prevOrdersSync.initialOrders || pathname !== prevOrdersSync.pathname) {
    setPrevOrdersSync({ initialOrders, pathname });
    setOrders(applyBeanOrderDeliveredPatch(initialOrders, consumeBeanOrderDeliveredPatch()));
  }

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    const flash = sessionStorage.getItem('bb-bean-order-flash');
    if (flash) {
      sessionStorage.removeItem('bb-bean-order-flash');
      setMessage(flash);
    } else {
      setMessage(null);
    }
  }

  useEffect(() => {
    if (embedded) return;

    let cancelled = false;
    warmRouteNavigation(`/${locale}/bean-orders/warm-detail`, router.prefetch);

    const cancelIdle = scheduleIdleWork(() => {
      if (cancelled) return;
      for (const order of orders.slice(0, 12)) {
        warmRouteNavigation(`/${locale}/bean-orders/${order.id}`, router.prefetch);
      }
    }, { timeout: 1200 });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [embedded, locale, orders, router]);

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
    <div className={embedded ? 'min-h-0 space-y-4' : BEAN_ORDER_PAGE}>
      {embedded ? (
        <div className="space-y-1">
          <h3 className="text-[15px] font-normal text-foreground">ออเดอร์เมล็ดกาแฟ</h3>
          <p className="text-[12px] text-muted-foreground">รับออเดอร์ / ตรวจสลิป / จัดส่ง</p>
        </div>
      ) : (
        <PageHeader
          className="mb-5 sm:mb-6"
          title="ออเดอร์เมล็ดกาแฟ"
          subtitle="รับออเดอร์ / ตรวจสลิป / จัดส่ง"
          size="large"
          actions={
            <Link
              href={`/${locale}/bean-orders/new`}
              className={BEAN_ORDER_BTN_PRIMARY_LINK}
            >
              <Plus className="h-4 w-4" aria-hidden /> สร้างออเดอร์
            </Link>
          }
        />
      )}

      {message && (
        <p className="mb-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground">
          {message}
        </p>
      )}

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          type="search"
          id="bean-orders-search"
          name="bean-orders-search"
          value={search}
          onChange={(e) => startTransition(() => setSearch(e.target.value))}
          placeholder="ค้นหาเลขออเดอร์ / ชื่อลูกค้า"
          className={BEAN_ORDER_INPUT}
        />
        <RoundedSelect
          name="bean-orders-payment-filter"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
        >
          <option value="all">ชำระเงิน: ทั้งหมด</option>
          <option value="unpaid">ยังไม่ชำระ</option>
          <option value="paid">ชำระแล้ว</option>
        </RoundedSelect>
        <RoundedSelect
          name="bean-orders-fulfillment-filter"
          value={fulfillmentFilter}
          onChange={(e) => setFulfillmentFilter(e.target.value as typeof fulfillmentFilter)}
        >
          <option value="all">จัดส่ง: ทั้งหมด</option>
          <option value="pending">ยังไม่ส่ง</option>
          <option value="shipped">ส่งแล้ว</option>
        </RoundedSelect>
      </div>

      <div className={BEAN_ORDER_LIST_CARD}>
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">ไม่พบออเดอร์</p>
        ) : (
          <ul
            className={`w-full p-2 lg:p-0 lg:grid lg:[&>li:not(:last-child)]:border-b lg:[&>li:not(:last-child)]:border-border/60 ${BEAN_ORDER_LIST_GRID} lg:gap-x-0`}
          >
            <li
              className={`hidden ${BEAN_ORDER_LIST_HEADER} lg:grid lg:grid-cols-subgrid lg:col-span-full lg:items-center lg:gap-x-0`}
              aria-hidden
            >
              <span className={BEAN_ORDER_LIST_CELL} />
              <span className={`whitespace-nowrap ${BEAN_ORDER_LIST_CELL}`}>ลูกค้า</span>
              <span className={`whitespace-nowrap ${BEAN_ORDER_LIST_CELL}`}>หมายเลขออเดอร์</span>
              <span className={BEAN_ORDER_LIST_CELL}>ปลายทาง</span>
              <span className={`whitespace-nowrap ${BEAN_ORDER_LIST_CELL}`}>ช่องทางจัดส่ง</span>
              <span className={`whitespace-nowrap text-right ${BEAN_ORDER_LIST_CELL}`}>ยอด</span>
              <span className={`whitespace-nowrap text-right ${BEAN_ORDER_LIST_CELL}`}>สถานะ</span>
            </li>
            {filtered.map((order) => (
              <BeanOrderListItem
                key={order.id}
                order={order}
                locale={locale}
                embedded={embedded}
                onOpenOrder={onOpenOrder}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
