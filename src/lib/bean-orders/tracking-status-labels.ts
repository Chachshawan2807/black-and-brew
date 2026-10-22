import { isTrackingDeliveredStatus } from '@/lib/bean-orders/delivery-notification';

/** Staff-facing shipment status manual workflow only (no carrier API sync). */
export function formatShipmentTrackingLabel(
  trackingStatus: string | null | undefined,
  options?: {
    fulfillmentStatus?: 'pending' | 'shipped';
    trackingNumber?: string | null;
  },
): string | null {
  if (isTrackingDeliveredStatus(trackingStatus)) return 'จัดส่งสำเร็จ';
  if (options?.fulfillmentStatus !== 'shipped') return null;
  if (options.trackingNumber) return 'จัดส่งแล้ว';
  return 'จัดส่งแล้ว (ไม่มีเลขพัสดุ)';
}
