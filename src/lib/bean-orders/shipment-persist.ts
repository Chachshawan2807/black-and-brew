import {
  OTHER_CARRIER_CODE,
  resolveCarrierCodeForSave,
} from '@/lib/bean-orders/carriers';

export const BEAN_ORDER_CARRIER_REQUIRED_ERROR = 'กรุณาระบุช่องทางจัดส่ง';

export function validateBeanOrderShipmentCarrier(input: {
  carrierCode: string;
  customCarrierLabel: string;
}): { ok: true; resolvedCarrierCode: string } | { ok: false; error: string } {
  if (input.carrierCode === OTHER_CARRIER_CODE && !input.customCarrierLabel.trim()) {
    return { ok: false, error: BEAN_ORDER_CARRIER_REQUIRED_ERROR };
  }

  const resolvedCarrierCode = resolveCarrierCodeForSave(input.carrierCode, input.customCarrierLabel);
  if (!resolvedCarrierCode) {
    return { ok: false, error: BEAN_ORDER_CARRIER_REQUIRED_ERROR };
  }

  return { ok: true, resolvedCarrierCode };
}

export function shouldPersistBeanOrderShipment(input: {
  carrierCode: string;
  customCarrierLabel: string;
  trackingNumber: string;
  isEdit: boolean;
  hasInitialShipment: boolean;
}): boolean {
  if (input.trackingNumber.trim()) return true;
  if (resolveCarrierCodeForSave(input.carrierCode, input.customCarrierLabel)) return true;
  return input.isEdit && input.hasInitialShipment;
}

export function shouldMarkBeanOrderShipped(input: {
  trackingNumber: string;
  fulfillmentStatus: 'pending' | 'shipped';
}): boolean {
  return Boolean(input.trackingNumber.trim()) || input.fulfillmentStatus === 'shipped';
}

/** Preserve existing tracking when a shipped order's field is left empty on save. */
export function resolveBeanOrderTrackingNumberForSave(input: {
  trackingNumber: string;
  previousTrackingNumber?: string | null;
  fulfillmentStatus: 'pending' | 'shipped';
}): string {
  const trimmed = input.trackingNumber.trim();
  if (trimmed) return trimmed;
  if (input.fulfillmentStatus === 'shipped') {
    return input.previousTrackingNumber?.trim() ?? '';
  }
  return '';
}
