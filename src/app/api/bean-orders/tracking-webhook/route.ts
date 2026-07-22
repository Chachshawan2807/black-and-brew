import { NextResponse } from 'next/server';
import {
  isTrackingWebhookVerification,
  parseTrackingWebhookEvents,
} from '@/lib/bean-orders/tracking-webhook';
import { maybeNotifyBeanOrderDelivered } from '@/lib/bean-orders/notify-delivered';
import { getSupabaseAdmin } from '@/lib/supabase-server';

async function applyTrackingUpdate(
  trackingNumber: string,
  status: string,
  raw: Record<string, unknown>,
  carrierCode: string | null,
): Promise<{ matched: boolean; shipmentId: string | null; previousStatus: string | null }> {
  const supabase = getSupabaseAdmin();

  const baseUpdate = {
    tracking_status: status,
    tracking_raw: raw,
  };

  if (carrierCode) {
    const { data: previousRows, error: previousError } = await supabase
      .from('bean_order_shipments')
      .select('id, tracking_status')
      .eq('tracking_number', trackingNumber)
      .eq('carrier_code', carrierCode)
      .limit(1);

    if (previousError) {
      console.error('Supabase Error (tracking webhook previous):', previousError.message, previousError.details);
      throw previousError;
    }

    const previous = previousRows?.[0] ?? null;
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
    if ((data ?? []).length > 0) {
      return {
        matched: true,
        shipmentId: (data?.[0]?.id as string) ?? null,
        previousStatus: (previous?.tracking_status as string | null) ?? null,
      };
    }
  }

  const { data: previousRows, error: previousError } = await supabase
    .from('bean_order_shipments')
    .select('id, tracking_status')
    .eq('tracking_number', trackingNumber)
    .limit(1);

  if (previousError) {
    console.error('Supabase Error (tracking webhook previous fallback):', previousError.message, previousError.details);
    throw previousError;
  }

  const previous = previousRows?.[0] ?? null;
  const { data, error } = await supabase
    .from('bean_order_shipments')
    .update(baseUpdate)
    .eq('tracking_number', trackingNumber)
    .select('id');

  if (error) {
    console.error('Supabase Error (tracking webhook fallback):', error.message, error.details);
    throw error;
  }

  return {
    matched: (data ?? []).length > 0,
    shipmentId: (data?.[0]?.id as string) ?? null,
    previousStatus: (previous?.tracking_status as string | null) ?? null,
  };
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
      const result = await applyTrackingUpdate(
        event.trackingNumber,
        event.status,
        payload.data && typeof payload.data === 'object'
          ? (payload.data as Record<string, unknown>)
          : payload,
        event.carrierCode,
      );
      if (result.matched) {
        applied += 1;
        await maybeNotifyBeanOrderDelivered({
          shipmentId: result.shipmentId ?? undefined,
          trackingNumber: event.trackingNumber,
          previousStatus: result.previousStatus,
          nextStatus: event.status,
          carrierCode: event.carrierCode,
        }).catch((error) => {
          console.error('maybeNotifyBeanOrderDelivered:', error);
        });
      }
    }

    return NextResponse.json({ ok: true, applied });
  } catch (error) {
    console.error('tracking-webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
