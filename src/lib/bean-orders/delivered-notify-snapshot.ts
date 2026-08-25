import {
  destinationFromBeanOrderRecipient,
  type BeanOrderDeliveredNotifyInput,
} from '@/lib/bean-orders/delivery-notification';
import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';

export const BEAN_ORDER_DELIVERED_PATCH_KEY = 'bb-bean-order-delivered-id';

export type BeanOrderDeliveredNotifySource = {
  id: string;
  orderNo: string;
  recipientName: string;
  recipientAddress: string;
  recipientProvince: string | null;
  recipientPostalCode: string | null;
  customerName: string | null;
};

export function buildBeanOrderDeliveredNotifyInput(
  order: BeanOrderDeliveredNotifySource,
  trackingNumber: string | null,
  carrierCode: string | null,
  locale = 'th',
): BeanOrderDeliveredNotifyInput {
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    customerName: getBeanOrderCustomerDisplayName({
      customerName: order.customerName,
      recipientName: order.recipientName,
    }),
    destination: destinationFromBeanOrderRecipient({
      recipientAddress: order.recipientAddress,
      recipientProvince: order.recipientProvince,
      recipientPostalCode: order.recipientPostalCode,
      recipientName: order.recipientName,
    }),
    trackingNumber,
    carrierCode,
    locale,
  };
}

export function stashBeanOrderDeliveredPatch(orderId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(BEAN_ORDER_DELIVERED_PATCH_KEY, orderId);
}

export function consumeBeanOrderDeliveredPatch(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const orderId = sessionStorage.getItem(BEAN_ORDER_DELIVERED_PATCH_KEY);
  if (orderId) sessionStorage.removeItem(BEAN_ORDER_DELIVERED_PATCH_KEY);
  return orderId;
}

export function applyBeanOrderDeliveredPatch<T extends { id: string; trackingStatus: string | null }>(
  orders: T[],
  orderId: string | null,
): T[] {
  if (!orderId) return orders;
  return orders.map((order) =>
    order.id === orderId ? { ...order, trackingStatus: 'delivered' } : order,
  );
}
