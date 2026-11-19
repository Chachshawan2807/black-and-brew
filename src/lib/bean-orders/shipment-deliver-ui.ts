import { isTrackingDeliveredStatus } from '@/lib/bean-orders/delivery-notification-format';
import type { FulfillmentStatus } from '@/lib/bean-orders/types';

export function hasBeanOrderSavedTrackingNumber(
  savedTrackingNumber: string | null | undefined,
): boolean {
  return Boolean(savedTrackingNumber?.trim());
}

/** ปิดงานจัดส่งสำหรับรายการ/insights (มีเลขพัสดุบันทึกแล้วหรือจัดส่งแล้วหรือยืนยันสำเร็จ). */
export function isBeanOrderShipmentWorkflowClosed(input: {
  fulfillmentStatus?: FulfillmentStatus | string | null;
  trackingNumber?: string | null;
  trackingStatus?: string | null;
  cancelledAt?: string | null;
}): boolean {
  if (input.cancelledAt) return false;
  if (isTrackingDeliveredStatus(input.trackingStatus)) return true;
  if (input.fulfillmentStatus === 'shipped') return true;
  return hasBeanOrderSavedTrackingNumber(input.trackingNumber);
}