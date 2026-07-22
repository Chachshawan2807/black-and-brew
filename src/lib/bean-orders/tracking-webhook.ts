export type TrackingWebhookEvent = {
  trackingNumber: string;
  carrierCode: string | null;
  status: string;
};

function readString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeEvent(record: Record<string, unknown>): TrackingWebhookEvent | null {
  const trackingNumber = readString(record, 'tracking_number', 'trackingNumber');
  if (!trackingNumber) return null;

  const carrierCode = readString(record, 'courier_code', 'carrierCode', 'carrier_code');
  const status =
    readString(record, 'delivery_status', 'status', 'latest_status') ?? 'updated';

  return { trackingNumber, carrierCode, status };
}

export function isTrackingWebhookVerification(payload: Record<string, unknown>): boolean {
  const event = readString(payload, 'event', 'type', 'action');
  if (event && /verify/i.test(event)) return true;
  if (payload.verify === true) return true;
  return false;
}

/** Normalize TrackingMore V4 webhook payloads (single object, nested data, or batch). */
export function parseTrackingWebhookEvents(payload: Record<string, unknown>): TrackingWebhookEvent[] {
  const rawData = payload.data;
  const candidates: Record<string, unknown>[] = [];

  if (Array.isArray(rawData)) {
    for (const item of rawData) {
      if (item && typeof item === 'object') candidates.push(item as Record<string, unknown>);
    }
  } else if (rawData && typeof rawData === 'object') {
    candidates.push(rawData as Record<string, unknown>);
  } else {
    candidates.push(payload);
  }

  return candidates
    .map((item) => normalizeEvent(item))
    .filter((item): item is TrackingWebhookEvent => item !== null);
}
