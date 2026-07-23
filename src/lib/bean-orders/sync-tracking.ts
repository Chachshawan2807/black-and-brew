import { isStaleTrackingStatus } from '@/lib/bean-orders/carrier-codes';
import {
  fetchTrackingMoreStatusWithRepair,
  resolveTrackingMoreCarrierCode,
} from '@/lib/bean-orders/trackingmore';
import { maybeNotifyBeanOrderDelivered } from '@/lib/bean-orders/notify-delivered';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export type SyncBeanOrderTrackingResult = {
  scanned: number;
  updated: number;
  repaired: number;
};

/** Rows with null status must sync — PostgREST `.neq('delivered')` omits NULL in SQL. */
export function shouldIncludeInTrackingSync(status: string | null | undefined): boolean {
  if (!status) return true;
  const normalized = status.toLowerCase().replace(/[_\s-]+/g, '');
  return !normalized.includes('delivered');
}

async function syncShipmentRows(
  rows: Array<{
    id: string;
    carrier_code: string | null;
    tracking_number: string | null;
    tracking_status: string | null;
  }>,
): Promise<SyncBeanOrderTrackingResult> {
  const supabase = getSupabaseAdmin();
  let updated = 0;
  let repaired = 0;

  for (const row of rows) {
    const trackingNumber = row.tracking_number as string;
    const storedCarrierCode = row.carrier_code as string;
    if (!trackingNumber || !storedCarrierCode || storedCarrierCode === 'other') continue;

    const result = await fetchTrackingMoreStatusWithRepair(trackingNumber, storedCarrierCode);
    if (!result.ok) continue;

    const nextCarrierCode = result.carrierCode ?? resolveTrackingMoreCarrierCode(storedCarrierCode) ?? storedCarrierCode;
    const carrierChanged = nextCarrierCode !== storedCarrierCode;
    const previousStatus = row.tracking_status;

    const { error: updateError } = await supabase
      .from('bean_order_shipments')
      .update({
        carrier_code: nextCarrierCode,
        tracking_status: result.status,
        tracking_raw: result.raw,
      })
      .eq('id', row.id as string);

    if (!updateError) {
      updated += 1;
      if (carrierChanged) repaired += 1;
      await maybeNotifyBeanOrderDelivered({
        shipmentId: row.id as string,
        trackingNumber,
        previousStatus,
        nextStatus: result.status,
        carrierCode: nextCarrierCode,
      }).catch((error) => {
        console.error('maybeNotifyBeanOrderDelivered:', error);
      });
    }
  }

  return { scanned: rows.length, updated, repaired };
}

export async function syncBeanOrderTrackingStatuses(): Promise<SyncBeanOrderTrackingResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('bean_order_shipments')
    .select('id, carrier_code, tracking_number, tracking_status')
    .not('tracking_number', 'is', null);

  if (error) {
    console.error('Supabase Error (syncBeanOrderTrackingStatuses):', error.message, error.details);
    throw new Error(error.message);
  }

  const rows = (data ?? []).filter((row) =>
    shouldIncludeInTrackingSync(row.tracking_status as string | null),
  );

  return syncShipmentRows(rows);
}

/** Refresh only shipments with missing or stale tracking status (for list page). */
export async function syncStaleBeanOrderTrackingStatuses(): Promise<SyncBeanOrderTrackingResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('bean_order_shipments')
    .select('id, carrier_code, tracking_number, tracking_status')
    .not('tracking_number', 'is', null);

  if (error) {
    console.error('Supabase Error (syncStaleBeanOrderTrackingStatuses):', error.message, error.details);
    throw new Error(error.message);
  }

  const staleRows = (data ?? []).filter((row) =>
    isStaleTrackingStatus(row.tracking_status as string | null),
  );

  return syncShipmentRows(staleRows);
}
