export type BeanOrderCarrier = {
  code: string;
  label: string;
};

/** Common Thai carriers for bean order shipments. */
export const BEAN_ORDER_CARRIERS: BeanOrderCarrier[] = [
  { code: 'kerryexpress-th', label: 'Kerry' },
  { code: 'flashexpress', label: 'Flash' },
  { code: 'thailand-post', label: 'ไปรษณีย์ไทย' },
  { code: 'lalamove', label: 'Lalamove' },
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

export function formatBeanOrderCarrierChangeMessage(
  previousCarrierCode: string | null | undefined,
  nextCarrierCode: string | null | undefined,
): string {
  const nextLabel = getCarrierLabel(nextCarrierCode);
  const previousLabel = getCarrierLabel(previousCarrierCode);
  if (!previousCarrierCode || previousLabel === '—') {
    return `บันทึกช่องทางจัดส่ง: ${nextLabel}`;
  }
  if (previousLabel === nextLabel) {
    return 'อัปเดตการจัดส่งแล้ว';
  }
  return `เปลี่ยนช่องทางการจัดส่งจาก ${previousLabel} เป็น ${nextLabel}`;
}
