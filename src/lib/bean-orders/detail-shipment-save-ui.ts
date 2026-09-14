import { shouldMarkBeanOrderShipped } from '@/lib/bean-orders/shipment-persist';

export function shouldShowBeanOrderDetailShipmentSaveButton(input: {
  fulfillmentStatus: 'pending' | 'shipped';
  trackingNumber: string;
}): boolean {
  return shouldMarkBeanOrderShipped(input);
}

export function getBeanOrderDetailShipmentSaveButtonLabel(
  fulfillmentStatus: 'pending' | 'shipped',
): string {
  return fulfillmentStatus === 'shipped' ? 'อัปเดตการจัดส่ง' : 'บันทึกการจัดส่ง';
}
