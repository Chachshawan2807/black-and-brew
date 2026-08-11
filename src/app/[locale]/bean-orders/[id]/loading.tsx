import { BEAN_ORDER_CARD, BEAN_ORDER_DETAIL_PAGE } from '../_components/bean-order-layout';

export default function BeanOrderDetailLoading() {
  return (
    <div className={BEAN_ORDER_DETAIL_PAGE}>
      <div className="mb-4 h-4 w-24 rounded bb-shimmer" aria-hidden />
      <div className="mb-4 h-8 w-48 max-w-full rounded bb-shimmer" aria-hidden />
      <div className={`${BEAN_ORDER_CARD} mb-4 space-y-3 p-4`} aria-hidden>
        <div className="h-3 w-20 rounded bb-shimmer" />
        <div className="h-4 w-full rounded bb-shimmer" />
        <div className="h-4 w-4/5 rounded bb-shimmer" />
      </div>
      <div className={`${BEAN_ORDER_CARD} mb-4 space-y-3 p-4`} aria-hidden>
        <div className="h-3 w-16 rounded bb-shimmer" />
        <div className="h-4 w-full rounded bb-shimmer" />
        <div className="h-4 w-full rounded bb-shimmer" />
        <div className="h-4 w-2/3 rounded bb-shimmer" />
      </div>
      <p className="text-center text-sm text-muted-foreground" role="status">
        กำลังโหลดออเดอร์...
      </p>
    </div>
  );
}
