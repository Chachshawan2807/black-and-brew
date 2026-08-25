export function mapTrackingStatusLabel(status: string): string {
  const normalized = status.toLowerCase().replace(/[_\s-]+/g, '');
  if (normalized.includes('delivered')) return 'จัดส่งสำเร็จ';
  if (normalized.includes('registered')) return 'ลงทะเบียนติดตามแล้ว';
  if (normalized.includes('inforeceived')) return 'รับข้อมูลจากขนส่งแล้ว';
  if (normalized.includes('notfound')) return 'ยังไม่พบในระบบขนส่ง';
  if (
    normalized.includes('transit') ||
    normalized.includes('pickup') ||
    normalized.includes('outfordelivery')
  ) {
    return 'กำลังจัดส่ง';
  }
  if (normalized.includes('pending')) return 'รอขนส่งอัปเดตสถานะ';
  if (normalized === 'unknown') return 'รออัปเดตสถานะ';
  if (normalized.includes('expired')) return 'หมดอายุการติดตาม';
  if (normalized.includes('exception') || normalized.includes('failed')) return 'มีปัญหา';
  return status;
}

export function formatShipmentTrackingLabel(
  trackingStatus: string | null | undefined,
  options?: {
    fulfillmentStatus?: 'pending' | 'shipped';
    trackingNumber?: string | null;
  },
): string | null {
  if (trackingStatus) return mapTrackingStatusLabel(trackingStatus);
  if (options?.fulfillmentStatus !== 'shipped') return null;
  if (options.trackingNumber) return 'รออัปเดตสถานะ';
  return 'ส่งแล้ว (ไม่มีเลขพัสดุ)';
}
