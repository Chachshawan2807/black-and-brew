export function isBeanOrderEditDataReady(
  mode: 'create' | 'edit',
  orderId: string | undefined,
  hasInitialOrder: boolean,
): boolean {
  return mode !== 'edit' || Boolean(orderId && hasInitialOrder);
}
