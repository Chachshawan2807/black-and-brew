export type BeanOrderCarrier = {
  code: string;
  label: string;
};

/** Common Thai carriers supported by TrackingMore (courier_code values). */
export const BEAN_ORDER_CARRIERS: BeanOrderCarrier[] = [
  { code: 'kerry-logistics', label: 'Kerry Express' },
  { code: 'flash-express', label: 'Flash Express' },
  { code: 'thailand-post', label: 'ไปรษณีย์ไทย' },
  { code: 'jt-express', label: 'J&T Express' },
  { code: 'best-express', label: 'Best Express' },
  { code: 'ninjavan', label: 'Ninja Van' },
  { code: 'dhl', label: 'DHL' },
  { code: 'other', label: 'อื่นๆ' },
];

export function getCarrierLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return BEAN_ORDER_CARRIERS.find((c) => c.code === code)?.label ?? code;
}
