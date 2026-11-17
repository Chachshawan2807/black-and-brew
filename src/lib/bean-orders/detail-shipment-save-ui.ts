export function isBeanOrderDetailTrackingDirty(
  trackingNumber: string,
  savedTrackingNumber?: string | null,
): boolean {
  return trackingNumber.trim() !== (savedTrackingNumber ?? '').trim();
}

/** อัปเดตการจัดส่ง: เฉพาะเมื่อเลขพัสดุในฟอร์มต่างจากที่บันทึกไว้ */
export function shouldShowBeanOrderDetailShipmentSaveButton(input: {
  trackingNumber: string;
  savedTrackingNumber?: string | null;
}): boolean {
  return isBeanOrderDetailTrackingDirty(input.trackingNumber, input.savedTrackingNumber);
}

export function getBeanOrderDetailShipmentSaveButtonLabel(
  _fulfillmentStatus: 'pending' | 'shipped',
): string {
  return 'อัปเดตการจัดส่ง';
}