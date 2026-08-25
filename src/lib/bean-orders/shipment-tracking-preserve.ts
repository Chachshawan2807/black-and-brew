import { isStaleTrackingStatus, resolveTrackingMoreCarrierCode } from '@/lib/bean-orders/carrier-codes';

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
  return resolveTrackingMoreCarrierCode(code) ?? code;
}

function normalizeTrackingNumber(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

/** Clear cached TrackingMore fields only when the trackable identity changes. */
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

/** Poll TrackingMore after ship when identity changed or cached status is still stale. */
export function shouldSyncBeanOrderTrackingAfterShip(
  trackable: boolean,
  resetTracking: boolean,
  existingStatus: string | null | undefined,
): boolean {
  if (!trackable) return false;
  if (resetTracking) return true;
  return isStaleTrackingStatus(existingStatus);
}
