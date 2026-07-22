export type BeanOrderCarrier = {
  code: string;
  label: string;
};

/** Common Thai carriers — codes must match TrackingMore V4 courier_code. */
export const BEAN_ORDER_CARRIERS: BeanOrderCarrier[] = [
  { code: 'kerryexpress-th', label: 'Kerry Express' },
  { code: 'flashexpress', label: 'Flash Express' },
  { code: 'thailand-post', label: 'ไปรษณีย์ไทย' },
  { code: 'jt-express-th', label: 'J&T Express' },
  { code: 'best-th', label: 'Best Express' },
  { code: 'ninjavan-th', label: 'Ninja Van' },
  { code: 'dhl', label: 'DHL' },
  { code: 'other', label: 'อื่นๆ' },
];

export function getCarrierLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return BEAN_ORDER_CARRIERS.find((c) => c.code === code)?.label ?? code;
}
