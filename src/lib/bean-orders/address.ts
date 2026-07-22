import { BEAN_ORDER_FIELD_SEPARATOR } from './defaults';
import { lookupThaiPostalAreas, normalizeThaiPostalCode } from './thai-postal-lookup';

export type ThaiPostalAddressValue = {
  name: string;
  phone: string;
  postalCode: string;
  areaId: string;
  subdistrict: string;
  district: string;
  province: string;
  addressLine: string;
};

export function emptyThaiPostalAddress(name = ''): ThaiPostalAddressValue {
  return {
    name,
    phone: '',
    postalCode: '',
    areaId: '',
    subdistrict: '',
    district: '',
    province: '',
    addressLine: '',
  };
}

export function parseThaiPostalAddressLine(
  stored: string,
  options?: {
    name?: string;
    phone?: string;
    province?: string | null;
    postalCode?: string | null;
  },
): ThaiPostalAddressValue {
  const trimmed = stored.trim();
  const postalCode =
    normalizeThaiPostalCode(options?.postalCode ?? '') ||
    (trimmed.match(/(\d{5})\s*$/)?.[1] ?? '');
  const province = options?.province?.trim() ?? '';
  const areas = lookupThaiPostalAreas(postalCode);
  const matched =
    areas.find((area) => area.province === province) ??
    (areas.length === 1 ? areas[0] : undefined);

  let addressLine = trimmed;
  if (matched) {
    const suffix = [matched.subdistrict, matched.district, matched.province, postalCode]
      .filter(Boolean)
      .join(' ');
    if (suffix && addressLine.endsWith(suffix)) {
      addressLine = addressLine.slice(0, -suffix.length).trim();
    }
  } else if (postalCode && addressLine.endsWith(postalCode)) {
    addressLine = addressLine.slice(0, -postalCode.length).trim();
  }

  return {
    name: options?.name ?? '',
    phone: options?.phone ?? '',
    postalCode,
    areaId: matched?.id ?? '',
    subdistrict: matched?.subdistrict ?? '',
    district: matched?.district ?? '',
    province: province || matched?.province || '',
    addressLine,
  };
}

export function addressProfileKey(value: ThaiPostalAddressValue): string {
  return [
    value.name.trim(),
    value.phone.trim(),
    value.postalCode.trim(),
    value.areaId.trim(),
    value.addressLine.trim(),
  ].join('|');
}

export function dedupeAddressProfiles(profiles: ThaiPostalAddressValue[]): ThaiPostalAddressValue[] {
  const seen = new Set<string>();
  const result: ThaiPostalAddressValue[] = [];
  for (const profile of profiles) {
    const key = addressProfileKey(profile);
    if (!key.replace(/\|/g, '').trim()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(profile);
  }
  return result;
}

export function formatAddressProfileLabel(value: ThaiPostalAddressValue): string {
  const parts = [
    value.phone.trim(),
    value.addressLine.trim(),
    value.subdistrict.trim(),
    value.district.trim(),
    value.province.trim(),
    value.postalCode.trim(),
  ].filter(Boolean);
  return parts.join(BEAN_ORDER_FIELD_SEPARATOR) || value.name.trim() || 'ที่อยู่';
}

/** สรุปปลายทางจัดส่งสำหรับรายการออเดอร์ (จังหวัด) */
export function formatOrderDeliveryDestination(options: {
  recipientAddress: string;
  recipientProvince?: string | null;
  recipientPostalCode?: string | null;
}): string {
  const parsed = parseThaiPostalAddressLine(options.recipientAddress, {
    province: options.recipientProvince,
    postalCode: options.recipientPostalCode,
  });

  const province = parsed.province || options.recipientProvince?.trim() || '';
  if (province) return `จ.${province}`;

  return '—';
}
