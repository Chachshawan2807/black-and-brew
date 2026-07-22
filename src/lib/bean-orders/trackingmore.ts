import {
  isStaleTrackingStatus,
  resolveTrackingMoreCarrierCode,
} from '@/lib/bean-orders/carrier-codes';
import {
  extractDeliveryStatus,
  inferCarrierFromTrackingNumber,
  normalizeTrackingMoreData,
  pickDetectedCarrierCode,
} from '@/lib/bean-orders/tracking-payload';

export { isStaleTrackingStatus, resolveTrackingMoreCarrierCode } from '@/lib/bean-orders/carrier-codes';
export {
  extractDeliveryStatus,
  inferCarrierFromTrackingNumber,
  normalizeTrackingMoreData,
} from '@/lib/bean-orders/tracking-payload';

export type TrackingMoreCreateInput = {
  trackingNumber: string;
  carrierCode: string;
};

export type TrackingMoreCreateResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export type TrackingMoreTrackResult =
  | { ok: true; status: string; raw: Record<string, unknown> }
  | { ok: false; error: string };

const TRACKINGMORE_BASE = 'https://api.trackingmore.com/v4';

function getApiKey(): string | null {
  const key = process.env.TRACKINGMORE_API_KEY?.trim();
  return key || null;
}

export function isTrackingMoreConfigured(): boolean {
  return Boolean(getApiKey());
}

export async function createTrackingMoreShipment(
  input: TrackingMoreCreateInput,
): Promise<TrackingMoreCreateResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: 'TRACKINGMORE_API_KEY is not configured' };
  }

  try {
    const courierCode = resolveTrackingMoreCarrierCode(input.carrierCode) ?? input.carrierCode;
    const response = await fetch(`${TRACKINGMORE_BASE}/trackings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tracking-Api-Key': apiKey,
      },
      body: JSON.stringify({
        tracking_number: input.trackingNumber,
        courier_code: courierCode,
      }),
      cache: 'no-store',
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (payload?.meta as { message?: string } | undefined)?.message ??
        `TrackingMore create failed (${response.status})`;
      console.error('TrackingMore create error:', message, payload);
      return { ok: false, error: message };
    }

    return { ok: true, data: payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TrackingMore request failed';
    console.error('TrackingMore create exception:', message);
    return { ok: false, error: message };
  }
}

export async function fetchTrackingMoreStatus(
  trackingNumber: string,
  carrierCode: string,
): Promise<TrackingMoreTrackResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: 'TRACKINGMORE_API_KEY is not configured' };
  }

  try {
    const courierCode = resolveTrackingMoreCarrierCode(carrierCode) ?? carrierCode;
    const url = new URL(`${TRACKINGMORE_BASE}/trackings/${encodeURIComponent(courierCode)}/${encodeURIComponent(trackingNumber)}`);
    const response = await fetch(url.toString(), {
      headers: { 'Tracking-Api-Key': apiKey },
      cache: 'no-store',
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (payload?.meta as { message?: string } | undefined)?.message ??
        `TrackingMore fetch failed (${response.status})`;
      console.error('TrackingMore fetch error:', message, payload);
      return { ok: false, error: message };
    }

    const data = normalizeTrackingMoreData(payload);
    const status = extractDeliveryStatus(data);
    if (!status) {
      return { ok: false, error: 'Tracking not found' };
    }

    return { ok: true, status, raw: data ?? {} };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TrackingMore request failed';
    console.error('TrackingMore fetch exception:', message);
    return { ok: false, error: message };
  }
}

export type TrackingMoreDetectResult =
  | { ok: true; code: string; raw: Record<string, unknown> }
  | { ok: false; error: string };

export async function detectTrackingMoreCarrier(
  trackingNumber: string,
): Promise<TrackingMoreDetectResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: 'TRACKINGMORE_API_KEY is not configured' };
  }

  try {
    const response = await fetch(`${TRACKINGMORE_BASE}/couriers/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tracking-Api-Key': apiKey,
      },
      body: JSON.stringify({ tracking_number: trackingNumber }),
      cache: 'no-store',
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (payload?.meta as { message?: string } | undefined)?.message ??
        `TrackingMore detect failed (${response.status})`;
      return { ok: false, error: message };
    }

    const data = payload.data;
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    const code = pickDetectedCarrierCode(rows as Record<string, unknown>[]);

    if (!code) {
      return { ok: false, error: 'Cannot detect courier' };
    }

    const first = rows[0] as Record<string, unknown>;
    return { ok: true, code, raw: first ?? {} };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TrackingMore detect failed';
    return { ok: false, error: message };
  }
}

export async function updateTrackingMoreCarrier(
  trackingNumber: string,
  carrierCode: string,
  updateCarrierCode: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: 'TRACKINGMORE_API_KEY is not configured' };
  }

  try {
    const response = await fetch(`${TRACKINGMORE_BASE}/trackings/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tracking-Api-Key': apiKey,
      },
      body: JSON.stringify({
        tracking_number: trackingNumber,
        carrier_code: carrierCode,
        update_carrier_code: updateCarrierCode,
      }),
      cache: 'no-store',
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        (payload?.meta as { message?: string } | undefined)?.message ??
        `TrackingMore update carrier failed (${response.status})`;
      return { ok: false, error: message };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TrackingMore update carrier failed';
    return { ok: false, error: message };
  }
}

export async function fetchTrackingMoreStatusWithRepair(
  trackingNumber: string,
  storedCarrierCode: string,
): Promise<TrackingMoreTrackResult & { carrierCode?: string }> {
  const candidates = [
    resolveTrackingMoreCarrierCode(storedCarrierCode),
    inferCarrierFromTrackingNumber(trackingNumber),
    storedCarrierCode,
  ].filter((code, index, all): code is string => Boolean(code) && all.indexOf(code) === index);

  let lastResult: TrackingMoreTrackResult | null = null;

  for (const code of candidates) {
    const result = await fetchTrackingMoreStatus(trackingNumber, code);
    lastResult = result;
    if (result.ok && !isStaleTrackingStatus(result.status)) {
      return { ...result, carrierCode: code };
    }
  }

  for (const code of candidates) {
    const created = await createTrackingMoreShipment({ trackingNumber, carrierCode: code });
    if (!created.ok) continue;

    const data = normalizeTrackingMoreData(created.data);
    const status = extractDeliveryStatus(data);
    if (!status) continue;

    const carrierCode =
      (typeof data?.courier_code === 'string' && data.courier_code) || code;

    return {
      ok: true,
      status,
      raw: data ?? {},
      carrierCode,
    };
  }

  const detected = await detectTrackingMoreCarrier(trackingNumber);
  if (detected.ok && !candidates.includes(detected.code)) {
    const created = await createTrackingMoreShipment({
      trackingNumber,
      carrierCode: detected.code,
    });
    if (created.ok) {
      const data = normalizeTrackingMoreData(created.data);
      const status = extractDeliveryStatus(data);
      if (status) {
        return {
          ok: true,
          status,
          raw: data ?? {},
          carrierCode: detected.code,
        };
      }
    }
  }

  return lastResult?.ok
    ? { ...lastResult, carrierCode: candidates[0] }
    : lastResult ?? { ok: false, error: 'Tracking not found' };
}

export function mapTrackingStatusLabel(status: string): string {
  const normalized = status.toLowerCase().replace(/[_\s-]+/g, '');
  if (normalized.includes('delivered')) return 'จัดส่งสำเร็จ';
  if (normalized.includes('registered')) return 'ลงทะเบียนติดตามแล้ว';
  if (normalized.includes('inforeceived')) return 'รับข้อมูลจากขนส่งแล้ว';
  if (normalized.includes('notfound')) return 'ยังไม่พบในระบบขนส่ง';
  if (
    normalized.includes('transit') ||
    normalized.includes('pickup') ||
    normalized.includes('outfordelivery')
  ) {
    return 'กำลังจัดส่ง';
  }
  if (normalized.includes('pending')) return 'รอขนส่งอัปเดตสถานะ';
  if (normalized === 'unknown') return 'รอซิงค์สถานะ';
  if (normalized.includes('expired')) return 'หมดอายุการติดตาม';
  if (normalized.includes('exception') || normalized.includes('failed')) return 'มีปัญหา';
  return status;
}

export function formatShipmentTrackingLabel(
  trackingStatus: string | null | undefined,
  options?: {
    fulfillmentStatus?: 'pending' | 'shipped';
    trackingNumber?: string | null;
  },
): string | null {
  if (trackingStatus) return mapTrackingStatusLabel(trackingStatus);
  if (options?.fulfillmentStatus !== 'shipped') return null;
  if (options.trackingNumber) return 'รออัปเดตสถานะ';
  return 'ส่งแล้ว (ไม่มีเลขพัสดุ)';
}
