let preloaded = false;

/** Warm the purchase-order modal chunk before the user opens it. */
export function preloadPurchaseOrdersModal(): void {
  if (typeof window === 'undefined' || preloaded) return;
  preloaded = true;
  void import('@/app/[locale]/inventory/_components/PurchaseOrdersModal');
}

/** @internal Vitest only */
export function resetPurchaseOrdersModalPreloadForTests(): void {
  preloaded = false;
}
