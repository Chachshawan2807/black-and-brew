import {
  destinationFromBeanOrderRecipient,
  shouldNotifyBeanOrderDelivered,
} from '@/lib/bean-orders/delivery-notification';
import { notifyBeanOrderDelivered } from '@/lib/bean-orders/delivery-web-push';
import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import { getSupabaseAdmin } from '@/lib/supabase-server';

type ShipmentLookup = {
  id: string;
  order_id: string;
  tracking_number: string | null;
  tracking_status: string | null;
  carrier_code: string | null;
};

/**
 * After a shipment tracking_status write, notify staff once when status becomes delivered.
 */
export async function maybeNotifyBeanOrderDelivered(options: {
  shipmentId?: string;
  trackingNumber?: string;
  previousStatus: string | null | undefined;
  nextStatus: string;
  carrierCode?: string | null;
}): Promise<void> {
  if (!shouldNotifyBeanOrderDelivered(options.previousStatus, options.nextStatus)) {
    return;
  }

  const supabase = getSupabaseAdmin();
  let shipment: ShipmentLookup | null = null;

  if (options.shipmentId) {
    const { data, error } = await supabase
      .from('bean_order_shipments')
      .select('id, order_id, tracking_number, tracking_status, carrier_code')
      .eq('id', options.shipmentId)
      .maybeSingle();
    if (error) {
      console.error('Supabase Error (maybeNotify shipment):', error.message, error.details);
      return;
    }
    shipment = data as ShipmentLookup | null;
  } else if (options.trackingNumber) {
    let query = supabase
      .from('bean_order_shipments')
      .select('id, order_id, tracking_number, tracking_status, carrier_code')
      .eq('tracking_number', options.trackingNumber)
      .limit(1);
    if (options.carrierCode) {
      query = query.eq('carrier_code', options.carrierCode);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error('Supabase Error (maybeNotify by tracking):', error.message, error.details);
      return;
    }
    shipment = data as ShipmentLookup | null;
  }

  if (!shipment?.order_id) return;

  const { data: order, error: orderError } = await supabase
    .from('bean_orders')
    .select(
      'id, order_no, recipient_name, recipient_address, recipient_province, recipient_postal_code, bean_customers(name)',
    )
    .eq('id', shipment.order_id)
    .maybeSingle();

  if (orderError) {
    console.error('Supabase Error (maybeNotify order):', orderError.message, orderError.details);
    return;
  }
  if (!order) return;

  const customer = order.bean_customers as { name?: string } | null;

  await notifyBeanOrderDelivered({
    orderId: order.id as string,
    orderNo: (order.order_no as string) || shipment.order_id,
    customerName: getBeanOrderCustomerDisplayName({
      customerName: customer?.name ?? null,
      recipientName: (order.recipient_name as string) || '',
    }),
    destination: destinationFromBeanOrderRecipient({
      recipientAddress: (order.recipient_address as string) || '',
      recipientProvince: (order.recipient_province as string | null) ?? null,
      recipientPostalCode: (order.recipient_postal_code as string | null) ?? null,
      recipientName: (order.recipient_name as string) || '',
    }),
    trackingNumber: shipment.tracking_number,
    carrierCode: shipment.carrier_code,
  });
}
