import { createPreloadOnce } from '@/lib/create-preload-once';

const { preload: preloadPurchaseOrdersModal, resetForTests: resetPurchaseOrdersModalPreloadForTests } =
  createPreloadOnce(() => import('@/app/[locale]/inventory/_components/PurchaseOrdersModal'));

/** Warm the purchase-order modal chunk before the user opens it. */
export { preloadPurchaseOrdersModal };

/** @internal Vitest only */
export { resetPurchaseOrdersModalPreloadForTests };
