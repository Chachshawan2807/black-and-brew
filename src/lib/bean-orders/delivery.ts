import type { DeliveryType } from '@/lib/bean-orders/types';

export function getDeliveryTypeLabel(type: DeliveryType): string {
  return type === 'parcel' ? 'พัสดุ' : 'อื่นๆ';
}
