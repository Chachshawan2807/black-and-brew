import { createPreloadOnce } from '@/lib/create-preload-once';

const {
  preload: preloadPasteCustomerDialog,
  resetForTests: resetPasteCustomerDialogPreloadForTests,
} = createPreloadOnce(() => import('@/app/[locale]/bean-orders/_components/PasteCustomerDialog'));

const {
  preload: preloadClearCustomerConfirmDialog,
  resetForTests: resetClearCustomerConfirmDialogPreloadForTests,
} = createPreloadOnce(() =>
  import('@/app/[locale]/bean-orders/_components/ClearCustomerConfirmDialog'),
);

const {
  preload: preloadAddressProfilePickerDialog,
  resetForTests: resetAddressProfilePickerDialogPreloadForTests,
} = createPreloadOnce(() =>
  import('@/app/[locale]/bean-orders/_components/AddressProfilePickerDialog'),
);

/** Warm the paste-customer dialog chunk before the user opens it. */
export { preloadPasteCustomerDialog };

/** Warm the clear-customer confirm dialog chunk before the user opens it. */
export { preloadClearCustomerConfirmDialog };

/** Warm the address profile picker dialog chunk before the user opens it. */
export { preloadAddressProfilePickerDialog };

/** @internal Vitest only */
export function resetBeanOrderFormDialogPreloadForTests(): void {
  resetPasteCustomerDialogPreloadForTests();
  resetClearCustomerConfirmDialogPreloadForTests();
  resetAddressProfilePickerDialogPreloadForTests();
}
