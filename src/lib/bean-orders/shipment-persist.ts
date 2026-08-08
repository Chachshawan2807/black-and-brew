import { resolveCarrierCodeForSave } from '@/lib/bean-orders/carriers';

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
