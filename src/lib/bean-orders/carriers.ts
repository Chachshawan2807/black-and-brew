export type BeanOrderCarrier = {
  code: string;
  label: string;
};

/** Common Thai carriers — codes must match TrackingMore V4 courier_code. */
export const BEAN_ORDER_CARRIERS: BeanOrderCarrier[] = [
  { code: 'kerryexpress-th', label: 'Kerry' },
  { code: 'flashexpress', label: 'Flash' },
  { code: 'thailand-post', label: 'ไปรษณีย์ไทย' },
  { code: 'other', label: 'อื่นๆ' },
];

export const OTHER_CARRIER_CODE = 'other';

export function isKnownCarrierCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return BEAN_ORDER_CARRIERS.some((carrier) => carrier.code === code);
}

export function initialCarrierSelection(carrierCode: string | null | undefined): {
  carrierCode: string;
  customCarrierLabel: string;
} {
  if (!carrierCode) {
    return { carrierCode: 'kerryexpress-th', customCarrierLabel: '' };
  }
  if (isKnownCarrierCode(carrierCode)) {
    return { carrierCode, customCarrierLabel: '' };
  }
  return { carrierCode: OTHER_CARRIER_CODE, customCarrierLabel: carrierCode };
}

export function resolveCarrierCodeForSave(
  carrierCode: string,
  customCarrierLabel: string,
): string | null {
  if (carrierCode === OTHER_CARRIER_CODE) {
    return customCarrierLabel.trim() || null;
  }
  return carrierCode;
}

export function getCarrierLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return BEAN_ORDER_CARRIERS.find((c) => c.code === code)?.label ?? code;
}

const TRACKABLE_CARRIER_CODES = new Set(
  BEAN_ORDER_CARRIERS.map((carrier) => carrier.code).filter((code) => code !== 'other'),
);

/** Carriers that support TrackingMore auto-sync (excludes manual / other). */
export function isTrackableCarrierCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return TRACKABLE_CARRIER_CODES.has(code);
}
