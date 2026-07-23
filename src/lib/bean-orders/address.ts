import { BEAN_ORDER_FIELD_SEPARATOR } from './defaults';
import {
  lookupThaiPostalAreas,
  normalizeThaiPostalCode,
  type ThaiPostalAreaOption,
} from './thai-postal-lookup';

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** ดึงรหัสไปรษณีย์ 5 หลักจากข้อความที่อยู่ (ไม่จำกัดเฉพาะท้ายบรรทัด) */
export function extractPostalCodeFromAddressText(text: string): string {
  const matches = [...text.matchAll(/(?:^|\s)(\d{5})(?=\s|$)/g)];
  if (matches.length === 0) return '';
  return matches[matches.length - 1]?.[1] ?? '';
}

function scorePostalAreaMatch(
  addressLine: string,
  area: ThaiPostalAreaOption,
  provinceHint?: string,
): number {
  let score = 0;
  if (provinceHint && area.province === provinceHint) score += 1;

  const localityChecks = [
    { value: area.subdistrict, weight: 4, prefixes: ['ต.', 'ตำบล', 'แขวง'] },
    { value: area.district, weight: 3, prefixes: ['อ.', 'อำเภอ', 'เขต'] },
    { value: area.province, weight: 2, prefixes: ['จ.', 'จังหวัด'] },
  ] as const;

  for (const { value, weight, prefixes } of localityChecks) {
    if (!value) continue;
    if (addressLine.includes(value)) score += weight;
    for (const prefix of prefixes) {
      if (addressLine.includes(`${prefix}${value}`) || addressLine.includes(`${prefix} ${value}`)) {
        score += weight;
      }
    }
  }

  if (
    area.subdistrict &&
    area.subdistrict !== area.district &&
    addressLine.includes(area.subdistrict)
  ) {
    score += 2;
  }

  return score;
}

function findBestPostalArea(
  addressLine: string,
  postalCode: string,
  provinceHint?: string,
): ThaiPostalAreaOption | undefined {
  const areas = lookupThaiPostalAreas(postalCode);
  if (areas.length === 0) return undefined;
  if (areas.length === 1) return areas[0];

  let best: ThaiPostalAreaOption | undefined;
  let bestScore = 0;

  for (const area of areas) {
    const score = scorePostalAreaMatch(addressLine, area, provinceHint);
    if (score > bestScore) {
      bestScore = score;
      best = area;
    }
  }

  if (best) return best;
  if (provinceHint) {
    return areas.find((area) => area.province === provinceHint);
  }

  return undefined;
}

function stripStructuredLocalityFromAddressLine(
  addressLine: string,
  components: {
    subdistrict?: string;
    district?: string;
    province?: string;
    postalCode?: string;
  },
): string {
  let result = addressLine.trim();
  if (!result) return result;

  const strips: Array<{ value: string; prefixes: string[] }> = [];
  if (components.postalCode) strips.push({ value: components.postalCode, prefixes: [''] });
  if (components.province) strips.push({ value: components.province, prefixes: ['จ.', 'จังหวัด', ''] });
  if (components.district) strips.push({ value: components.district, prefixes: ['อ.', 'อำเภอ', 'เขต', ''] });
  if (components.subdistrict) {
    strips.push({ value: components.subdistrict, prefixes: ['ต.', 'ตำบล', 'แขวง', ''] });
  }

  for (const { value, prefixes } of strips) {
    if (!value) continue;
    const escaped = escapeRegExp(value);
    for (const prefix of prefixes) {
      const prefixPart = prefix ? `${escapeRegExp(prefix)}\\s*` : '';
      result = result.replace(new RegExp(`\\s*${prefixPart}${escaped}\\s*$`, 'i'), '');
      result = result.replace(new RegExp(`\\s+${prefixPart}${escaped}(?=\\s)`, 'gi'), ' ');
    }
    if (!prefixes.some(Boolean) && value === components.postalCode) {
      result = result.replace(new RegExp(`\\s*${escaped}\\s*`, 'g'), ' ');
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

function dedupeRepeatedPhrases(text: string): string {
  let result = text.trim();
  if (!result) return result;

  for (let words = 6; words >= 1; words -= 1) {
    let prev = '';
    while (prev !== result) {
      prev = result;
      const pattern = new RegExp(`(\\S+(?:\\s+\\S+){0,${words - 1}})\\s+\\1`, 'g');
      result = result.replace(pattern, '$1');
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

/** ล้างข้อมูลซ้ำในบ้านเลขที่หลังแยกรหัสไปรษณีย์/พื้นที่แล้ว */
export function finalizeCustomerAddress(value: ThaiPostalAddressValue): ThaiPostalAddressValue {
  const hasStructuredLocality = Boolean(
    value.postalCode || value.subdistrict || value.district || value.province,
  );

  const addressLine = hasStructuredLocality
    ? stripStructuredLocalityFromAddressLine(value.addressLine, {
        subdistrict: value.subdistrict,
        district: value.district,
        province: value.province,
        postalCode: value.postalCode,
      })
    : value.addressLine;

  return {
    ...value,
    addressLine: dedupeRepeatedPhrases(addressLine),
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
    extractPostalCodeFromAddressText(trimmed);
  const provinceHint = options?.province?.trim() ?? '';

  const matched = postalCode
    ? findBestPostalArea(trimmed, postalCode, provinceHint || undefined)
    : undefined;

  const province = provinceHint || matched?.province || '';
  const subdistrict = matched?.subdistrict ?? '';
  const district = matched?.district ?? '';

  const hasStructuredLocality = Boolean(subdistrict || district || province || postalCode);
  const addressLine = hasStructuredLocality
    ? stripStructuredLocalityFromAddressLine(trimmed, {
        subdistrict,
        district,
        province,
        postalCode,
      })
    : trimmed;

  return {
    name: options?.name ?? '',
    phone: options?.phone ?? '',
    postalCode,
    areaId: matched?.id ?? '',
    subdistrict,
    district,
    province,
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
