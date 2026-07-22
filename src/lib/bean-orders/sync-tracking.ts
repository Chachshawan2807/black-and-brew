import { fetchTrackingMoreStatus } from '@/lib/bean-orders/trackingmore';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export type SyncBeanOrderTrackingResult = {
  scanned: number;
  updated: number;
};

export async function syncBeanOrderTrackingStatuses(): Promise<SyncBeanOrderTrackingResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('bean_order_shipments')
    .select('id, carrier_code, tracking_number, tracking_status')
    .not('tracking_number', 'is', null)
    .neq('tracking_status', 'delivered');

  if (error) {
    console.error('Supabase Error (syncBeanOrderTrackingStatuses):', error.message, error.details);
    throw new Error(error.message);
  }

  let updated = 0;
  const rows = data ?? [];

  for (const row of rows) {
    const trackingNumber = row.tracking_number as string;
    const carrierCode = row.carrier_code as string;
    if (!trackingNumber || !carrierCode || carrierCode === 'other') continue;

    const result = await fetchTrackingMoreStatus(trackingNumber, carrierCode);
    if (!result.ok) continue;

    const { error: updateError } = await supabase
      .from('bean_order_shipments')
      .update({
        tracking_status: result.status,
        tracking_raw: result.raw,
      })
      .eq('id', row.id as string);

    if (!updateError) updated += 1;
  }

  return { scanned: rows.length, updated };
}
