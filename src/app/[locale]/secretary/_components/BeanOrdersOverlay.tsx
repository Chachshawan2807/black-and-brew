'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import {
  peekBeanOrdersForOverlay,
  prefetchBeanOrdersForOverlay,
} from '@/lib/secretary/overlay-data-cache';
import { fetchBeanOrderDetail } from '@/app/actions/bean-order-actions';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import type { SecretaryTask } from '@/lib/secretary/types';
import { SecretaryOverlayErrorState } from './SecretaryOverlayErrorState';
import { SecretaryOverlayLoadingSkeleton } from './SecretaryOverlayLoadingSkeleton';
import SecretaryTaskSubwindow from './SecretaryTaskSubwindow';

const BeanOrdersClient = dynamic(() => import('@/app/[locale]/bean-orders/BeanOrdersClient'), {
  ssr: false,
});

const BeanOrderDetailClient = dynamic(
  () => import('@/app/[locale]/bean-orders/BeanOrderDetailClient'),
  { ssr: false },
);

type BeanOrdersOverlayProps = {
  task: SecretaryTask;
  locale: string;
  onClose: () => void;
};

function resolveBeanOrderFilters(task: SecretaryTask): {
  paymentFilter: 'all' | 'unpaid' | 'paid';
  fulfillmentFilter: 'all' | 'pending' | 'shipped';
} {
  switch (task.task_type) {
    case 'bean_payment_pending':
      return { paymentFilter: 'unpaid', fulfillmentFilter: 'all' };
    case 'bean_ship_pending':
      return { paymentFilter: 'all', fulfillmentFilter: 'pending' };
    case 'bean_tracking_check':
      return { paymentFilter: 'all', fulfillmentFilter: 'shipped' };
    default:
      return { paymentFilter: 'all', fulfillmentFilter: 'all' };
  }
}

export default function BeanOrdersOverlay({ task, locale, onClose }: BeanOrdersOverlayProps) {
  const filters = useMemo(() => resolveBeanOrderFilters(task), [task]);
  const [orders, setOrders] = useState<BeanOrderListRow[] | null>(() => peekBeanOrdersForOverlay());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Awaited<
    ReturnType<typeof fetchBeanOrderDetail>
  >['data'] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void prefetchBeanOrdersForOverlay().then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setLoadError(result.error ?? 'ไม่สามารถโหลดออเดอร์ได้');
        setOrders([]);
        return;
      }
      setOrders(result.data ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    void (async () => {
      const result = await fetchBeanOrderDetail(selectedOrderId);
      if (cancelled) return;
      setDetailLoading(false);
      if (!result.success || !result.data) {
        setLoadError(result.error ?? 'ไม่สามารถโหลดรายละเอียดออเดอร์ได้');
        setSelectedOrderId(null);
        return;
      }
      setSelectedOrder(result.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedOrderId]);

  const title = selectedOrder ? selectedOrder.orderNo : task.title;

  return (
    <SecretaryTaskSubwindow title={title} onClose={onClose} maxWidthClass="max-w-4xl">
      {loadError ? <SecretaryOverlayErrorState message={loadError} /> : null}
      {orders === null || (selectedOrderId && detailLoading && !selectedOrder) ? (
        <SecretaryOverlayLoadingSkeleton
          variant="embed"
          label={selectedOrderId ? 'กำลังโหลดรายละเอียดออเดอร์...' : 'กำลังโหลดออเดอร์เมล็ดกาแฟ...'}
        />
      ) : selectedOrder ? (
        <div className="min-h-0 flex-1 overflow-y-auto bb-smooth-scroll [scrollbar-width:thin]">
          <BeanOrderDetailClient
            order={selectedOrder}
            locale={locale}
            embedded
            onBack={() => setSelectedOrderId(null)}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bb-smooth-scroll [scrollbar-width:thin]">
          <BeanOrdersClient
            initialOrders={orders}
            locale={locale}
            embedded
            defaultPaymentFilter={filters.paymentFilter}
            defaultFulfillmentFilter={filters.fulfillmentFilter}
            onOpenOrder={setSelectedOrderId}
          />
        </div>
      )}
    </SecretaryTaskSubwindow>
  );
}
