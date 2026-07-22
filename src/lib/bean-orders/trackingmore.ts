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
    const response = await fetch(`${TRACKINGMORE_BASE}/trackings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tracking-Api-Key': apiKey,
      },
      body: JSON.stringify({
        tracking_number: input.trackingNumber,
        courier_code: input.carrierCode,
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
    const url = new URL(`${TRACKINGMORE_BASE}/trackings/${encodeURIComponent(carrierCode)}/${encodeURIComponent(trackingNumber)}`);
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

    const data = (payload?.data as Record<string, unknown> | undefined) ?? payload;
    const status =
      (data?.delivery_status as string | undefined) ??
      (data?.status as string | undefined) ??
      'unknown';

    return { ok: true, status, raw: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TrackingMore request failed';
    console.error('TrackingMore fetch exception:', message);
    return { ok: false, error: message };
  }
}

export function mapTrackingStatusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('delivered')) return 'จัดส่งสำเร็จ';
  if (normalized.includes('registered')) return 'ลงทะเบียนติดตามแล้ว';
  if (
    normalized.includes('transit') ||
    normalized.includes('pickup') ||
    normalized.includes('outfordelivery') ||
    normalized.includes('out_for_delivery')
  ) {
    return 'กำลังจัดส่ง';
  }
  if (normalized.includes('pending') || normalized.includes('info')) return 'รอข้อมูล';
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
