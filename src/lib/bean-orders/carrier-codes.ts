/** TrackingMore courier_code values — see trackingmore.com help carrier list. */
export const LEGACY_TRACKINGMORE_CARRIER_CODES: Record<string, string> = {
  'kerry-logistics': 'kerryexpress-th',
  'flash-express': 'flashexpress',
  'jt-express': 'jt-express-th',
  ninjavan: 'ninjavan-th',
  'best-express': 'best-th',
};

export function resolveTrackingMoreCarrierCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return LEGACY_TRACKINGMORE_CARRIER_CODES[code] ?? code;
}

export function isStaleTrackingStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  const normalized = status.toLowerCase().replace(/[_\s-]+/g, '');
  return (
    normalized.includes('pending') ||
    normalized.includes('notfound') ||
    normalized === 'unknown' ||
    normalized === 'registered'
  );
}
