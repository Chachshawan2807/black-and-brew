/** Legacy carrier code aliases (historical DB values). */
export const LEGACY_CARRIER_CODE_ALIASES: Record<string, string> = {
  'kerry-logistics': 'kerryexpress-th',
  'flash-express': 'flashexpress',
  'jt-express': 'jt-express-th',
  ninjavan: 'ninjavan-th',
  'best-express': 'best-th',
};

export function resolveCarrierCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return LEGACY_CARRIER_CODE_ALIASES[code] ?? code;
}
