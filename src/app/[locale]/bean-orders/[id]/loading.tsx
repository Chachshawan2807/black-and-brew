import { BEAN_ORDER_DETAIL_PAGE } from '../_components/bean-order-layout';

export default function BeanOrderDetailLoading() {
  return (
    <div className={BEAN_ORDER_DETAIL_PAGE}>
      <div className="flex min-h-[50svh] items-center justify-center">
        <p className="text-sm text-muted-foreground" role="status">
          กำลังโหลดออเดอร์...
        </p>
      </div>
    </div>
  );
}
