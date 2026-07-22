import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const data = (payload?.data as Record<string, unknown> | undefined) ?? payload;
    const trackingNumber =
      (data?.tracking_number as string | undefined) ??
      (data?.trackingNumber as string | undefined);
    const carrierCode =
      (data?.courier_code as string | undefined) ??
      (data?.carrierCode as string | undefined);
    const status =
      (data?.delivery_status as string | undefined) ??
      (data?.status as string | undefined) ??
      'updated';

    if (!trackingNumber) {
      return NextResponse.json({ ok: false, error: 'missing tracking_number' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('bean_order_shipments')
      .update({
        tracking_status: status,
        tracking_raw: data as Record<string, unknown>,
      })
      .eq('tracking_number', trackingNumber);

    if (carrierCode) {
      query = query.eq('carrier_code', carrierCode);
    }

    const { error } = await query;
    if (error) {
      console.error('Supabase Error (tracking webhook):', error.message, error.details);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('tracking-webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
