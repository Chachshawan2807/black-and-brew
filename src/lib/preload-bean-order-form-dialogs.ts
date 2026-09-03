let pasteDialogPreloaded = false;
let clearConfirmPreloaded = false;
let addressPickerPreloaded = false;

/** Warm the paste-customer dialog chunk before the user opens it. */
export function preloadPasteCustomerDialog(): void {
  if (typeof window === 'undefined' || pasteDialogPreloaded) return;
  pasteDialogPreloaded = true;
  void import('@/app/[locale]/bean-orders/_components/PasteCustomerDialog');
}

/** Warm the clear-customer confirm dialog chunk before the user opens it. */
export function preloadClearCustomerConfirmDialog(): void {
  if (typeof window === 'undefined' || clearConfirmPreloaded) return;
  clearConfirmPreloaded = true;
  void import('@/app/[locale]/bean-orders/_components/ClearCustomerConfirmDialog');
}

/** Warm the address profile picker dialog chunk before the user opens it. */
export function preloadAddressProfilePickerDialog(): void {
  if (typeof window === 'undefined' || addressPickerPreloaded) return;
  addressPickerPreloaded = true;
  void import('@/app/[locale]/bean-orders/_components/AddressProfilePickerDialog');
}

/** @internal Vitest only */
export function resetBeanOrderFormDialogPreloadForTests(): void {
  pasteDialogPreloaded = false;
  clearConfirmPreloaded = false;
  addressPickerPreloaded = false;
}
