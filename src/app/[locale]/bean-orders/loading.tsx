import { BEAN_ORDER_PAGE } from './_components/bean-order-layout';
import { BeanOrderPageLoading } from './_components/bean-order-ui-primitives';

/** Lightweight in-layout loading avoids full-screen logo/skeleton interstitials on mobile. */
export default function BeanOrdersLoading() {
  return (
    <div className={BEAN_ORDER_PAGE}>
      <BeanOrderPageLoading label="กำลังโหลดออเดอร์..." />
    </div>
  );
}
