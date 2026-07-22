import { NextResponse } from 'next/server';
import { fetchTrackingMoreStatus } from '@/lib/bean-orders/trackingmore';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('bean_order_shipments')
      .select('id, carrier_code, tracking_number, tracking_status')
      .not('tracking_number', 'is', null)
      .neq('tracking_status', 'delivered');

    if (error) {
      console.error('Supabase Error (sync-tracking):', error.message, error.details);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let updated = 0;
    for (const row of data ?? []) {
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

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error('sync-tracking error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
