import { BEAN_ORDER_CARRIERS } from '@/lib/bean-orders/carriers';

const SUPPORTED_COURIER_CODES = new Set(BEAN_ORDER_CARRIERS.map((c) => c.code));

export function normalizeTrackingMoreData(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  const raw = payload.data;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const first = raw[0];
    return first && typeof first === 'object' && !Array.isArray(first)
      ? (first as Record<string, unknown>)
      : null;
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

export function extractDeliveryStatus(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  for (const key of ['delivery_status', 'status', 'latest_status']) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** Kerry rebranded tracking numbers often start with KEX. */
export function inferCarrierFromTrackingNumber(trackingNumber: string): string | null {
  const value = trackingNumber.trim().toUpperCase();
  if (value.startsWith('KEX')) return 'kerryexpress-th';
  return null;
}

export function pickDetectedCarrierCode(
  rows: Record<string, unknown>[],
): string | null {
  for (const row of rows) {
    const code =
      (typeof row.courier_code === 'string' && row.courier_code) ||
      (typeof row.code === 'string' && row.code) ||
      null;
    if (code && SUPPORTED_COURIER_CODES.has(code)) return code;
  }
  return null;
}
