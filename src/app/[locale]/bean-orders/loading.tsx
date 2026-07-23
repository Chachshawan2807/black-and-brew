import { BEAN_ORDER_PAGE } from './_components/bean-order-layout';

/** Lightweight in-layout loading — avoids full-screen logo/skeleton interstitials on mobile. */
export default function BeanOrdersLoading() {
  return (
    <div className={BEAN_ORDER_PAGE}>
      <div className="flex min-h-[50svh] items-center justify-center">
        <p className="text-sm text-muted-foreground" role="status">
          กำลังโหลด...
        </p>
      </div>
    </div>
  );
}
