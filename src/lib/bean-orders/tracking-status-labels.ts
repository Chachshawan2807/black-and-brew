/** Staff-facing shipment status manual workflow only (no carrier API sync). */
export function formatShipmentTrackingLabel(
  _trackingStatus: string | null | undefined,
  options?: {
    fulfillmentStatus?: 'pending' | 'shipped';
    trackingNumber?: string | null;
  },
): string | null {
  const hasTracking = Boolean(options?.trackingNumber?.trim());
  if (options?.fulfillmentStatus === 'shipped' || hasTracking) {
    return hasTracking ? 'จัดส่งแล้ว' : 'จัดส่งแล้ว (ไม่มีเลขพัสดุ)';
  }
  return null;
}
