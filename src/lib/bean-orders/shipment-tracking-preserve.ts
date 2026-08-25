import { resolveCarrierCode } from '@/lib/bean-orders/carrier-codes';

export type BeanOrderShipmentTrackingSnapshot = {
  carrierCode: string | null;
  trackingNumber: string | null;
  trackingStatus: string | null;
};

export type BeanOrderShipmentTrackingInput = {
  carrierCode: string | null;
  trackingNumber: string | null;
};

function normalizeCarrierCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return resolveCarrierCode(code) ?? code;
}

function normalizeTrackingNumber(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

/** Clear cached tracking fields when carrier or tracking number changes. */
export function shouldResetBeanOrderTrackingOnShip(
  existing: BeanOrderShipmentTrackingSnapshot | null,
  next: BeanOrderShipmentTrackingInput,
  isNewShipment: boolean,
): boolean {
  if (isNewShipment) return true;
  if (!existing) return true;

  const existingCarrier = normalizeCarrierCode(existing.carrierCode);
  const nextCarrier = normalizeCarrierCode(next.carrierCode);
  const existingTracking = normalizeTrackingNumber(existing.trackingNumber);
  const nextTracking = normalizeTrackingNumber(next.trackingNumber);

  return existingCarrier !== nextCarrier || existingTracking !== nextTracking;
}
