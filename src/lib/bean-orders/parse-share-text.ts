import {
  emptyThaiPostalAddress,
  parseThaiPostalAddressLine,
  type ThaiPostalAddressValue,
} from '@/lib/bean-orders/address';
import { lookupThaiPostalAreas, normalizeThaiPostalCode } from '@/lib/bean-orders/thai-postal-lookup';

export type BeanOrderCustomerParseSource = 'rules' | 'ai';

export type ParsedBeanOrderCustomer = {
  name: string;
  phone: string;
  address: ThaiPostalAddressValue;
  parseSource: BeanOrderCustomerParseSource;
  missingFields: Array<'name' | 'phone' | 'address'>;
};

const PLACEHOLDER_VALUES = new Set(['', '-', '—', '–']);

function normalizePlaceholder(value: string): string {
  const trimmed = value.trim();
  if (PLACEHOLDER_VALUES.has(trimmed)) return '';
  return trimmed;
}

function extractLabeledValue(text: string, label: string): string {
  const pattern = new RegExp(`^${label}\\s*:\\s*(.*)$`, 'm');
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function collectMissingFields(input: {
  name: string;
  phone: string;
  addressLine: string;
}): Array<'name' | 'phone' | 'address'> {
  const missing: Array<'name' | 'phone' | 'address'> = [];
  if (!input.name) missing.push('name');
  if (!input.phone) missing.push('phone');
  if (!input.addressLine) missing.push('address');
  return missing;
}

/** สำเร็จเมื่อมีชื่อ และมีเบอร์หรือที่อยู่อย่างน้อยหนึ่งอย่าง */
export function isBeanOrderCustomerParseUsable(result: ParsedBeanOrderCustomer): boolean {
  if (!result.name.trim()) return false;
  return Boolean(result.phone.trim() || result.address.addressLine.trim() || result.address.postalCode.trim());
}

function inferProvinceFromAddress(addressLine: string, postalCode?: string | null): string | undefined {
  const code =
    normalizeThaiPostalCode(postalCode ?? '') ||
    addressLine.match(/(\d{5})\s*$/)?.[1] ||
    '';
  if (!code) return undefined;

  const areas = lookupThaiPostalAreas(code);
  if (areas.length === 0) return undefined;
  if (areas.length === 1) return areas[0]?.province;

  const matched = areas.find(
    (area) =>
      addressLine.includes(area.province) ||
      addressLine.includes(area.district) ||
      addressLine.includes(area.subdistrict),
  );
  return matched?.province ?? areas[0]?.province;
}

export function buildParsedBeanOrderCustomer(input: {
  name: string;
  phone: string;
  addressLine: string;
  province?: string | null;
  postalCode?: string | null;
  parseSource: BeanOrderCustomerParseSource;
}): ParsedBeanOrderCustomer {
  const name = normalizePlaceholder(input.name);
  const phone = normalizePlaceholder(input.phone);
  const addressLine = normalizePlaceholder(input.addressLine);
  const province =
    input.province?.trim() ||
    (addressLine ? inferProvinceFromAddress(addressLine, input.postalCode) : undefined);

  const address =
    addressLine || province || input.postalCode
      ? parseThaiPostalAddressLine(addressLine || '', {
          name,
          phone,
          province,
          postalCode: input.postalCode,
        })
      : emptyThaiPostalAddress(name);

  if (!address.name) address.name = name;
  if (!address.phone) address.phone = phone;

  return {
    name,
    phone,
    address,
    parseSource: input.parseSource,
    missingFields: collectMissingFields({ name, phone, addressLine: address.addressLine || addressLine }),
  };
}

/** แยกชื่อ / เบอร์ / ที่อยู่จากข้อความคัดลอกออเดอร์ (รูปแบบ label คงที่) */
export function parseBeanOrderCustomerText(text: string): ParsedBeanOrderCustomer {
  const name = extractLabeledValue(text, 'ลูกค้า');
  const phone = extractLabeledValue(text, 'เบอร์');
  const addressLine = extractLabeledValue(text, 'ที่อยู่จัดส่ง');

  return buildParsedBeanOrderCustomer({
    name,
    phone,
    addressLine,
    parseSource: 'rules',
  });
}
