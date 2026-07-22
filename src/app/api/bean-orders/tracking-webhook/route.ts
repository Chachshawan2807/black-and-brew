import { NextResponse } from 'next/server';
import {
  isTrackingWebhookVerification,
  parseTrackingWebhookEvents,
} from '@/lib/bean-orders/tracking-webhook';
import { getSupabaseAdmin } from '@/lib/supabase-server';

async function applyTrackingUpdate(
  trackingNumber: string,
  status: string,
  raw: Record<string, unknown>,
  carrierCode: string | null,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const baseUpdate = {
    tracking_status: status,
    tracking_raw: raw,
  };

  if (carrierCode) {
    const { data, error } = await supabase
      .from('bean_order_shipments')
      .update(baseUpdate)
      .eq('tracking_number', trackingNumber)
      .eq('carrier_code', carrierCode)
      .select('id');

    if (error) {
      console.error('Supabase Error (tracking webhook):', error.message, error.details);
      throw error;
    }
    if ((data ?? []).length > 0) return true;
  }

  const { data, error } = await supabase
    .from('bean_order_shipments')
    .update(baseUpdate)
    .eq('tracking_number', trackingNumber)
    .select('id');

  if (error) {
    console.error('Supabase Error (tracking webhook fallback):', error.message, error.details);
    throw error;
  }

  return (data ?? []).length > 0;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;

    if (isTrackingWebhookVerification(payload)) {
      return NextResponse.json({ ok: true });
    }

    const events = parseTrackingWebhookEvents(payload);
    if (events.length === 0) {
      return NextResponse.json({ ok: false, error: 'missing tracking_number' }, { status: 400 });
    }

    let applied = 0;
    for (const event of events) {
      const matched = await applyTrackingUpdate(
        event.trackingNumber,
        event.status,
        payload.data && typeof payload.data === 'object'
          ? (payload.data as Record<string, unknown>)
          : payload,
        event.carrierCode,
      );
      if (matched) applied += 1;
    }

    return NextResponse.json({ ok: true, applied });
  } catch (error) {
    console.error('tracking-webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
