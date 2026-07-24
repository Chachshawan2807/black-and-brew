import {
  emptyThaiPostalAddress,
  extractPostalCodeFromAddressText,
  finalizeCustomerAddress,
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
const ERP_CUSTOMER_LABEL_PATTERN = /^(?:ลูกค้า|เบอร์|ที่อยู่จัดส่ง|ที่อยู่)\s*:/m;
const ADDRESS_HINT_PATTERN =
  /(ถนน|ซอย|หมู่|ต\.|อ\.|จ\.|แขวง|เขต|ร้าน|สาขา|หน้า|ข้าง|ตรงข้าม|\d+\/\d+|\d{5}\s*$)/;
const PASTE_NOISE_WORDS = new Set(['ครับ', 'ค่ะ', 'นะ', 'คะ', 'ขอบคุณ', 'ส่ง', 'เมล็ดกาแฟ', 'ให้']);

function normalizePlaceholder(value: string): string {
  const trimmed = value.trim();
  if (PLACEHOLDER_VALUES.has(trimmed)) return '';
  return trimmed;
}

function normalizeMatchText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function extractLabeledValue(text: string, label: string): string {
  const pattern = new RegExp(`^${label}\\s*:\\s*(.*)$`, 'm');
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function hasErpCustomerLabels(text: string): boolean {
  return ERP_CUSTOMER_LABEL_PATTERN.test(text);
}

function extractThaiPhone(text: string): { phone: string; remainder: string } | null {
  const match = text.match(/0\d[\d\s.-]{7,12}\d/);
  if (!match) return null;

  const phone = match[0].replace(/\D/g, '');
  if (phone.length < 9 || phone.length > 10) return null;

  const remainder = text
    .replace(match[0], '')
    .replace(/^[\s:：\-–—,]+/, '')
    .replace(/[\s:：\-–—,]+$/, '')
    .trim();

  return { phone, remainder };
}

function looksLikeAddressLine(line: string): boolean {
  return ADDRESS_HINT_PATTERN.test(line);
}

function looksLikePersonName(line: string): boolean {
  if (looksLikeAddressLine(line)) return false;
  if (/^ร้าน/.test(line)) return false;
  if (line.length > 50) return false;
  return true;
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
    extractPostalCodeFromAddressText(addressLine) ||
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

function cleanParsedName(value: string): string {
  const noise = ['เบอร์', 'โทร', 'ที่อยู่', 'ที่', 'ส่ง', 'เมล็ดกาแฟ'];
  let result = value.trim();
  for (const word of noise) {
    result = result.replace(new RegExp(`\\s*${word}\\s*`, 'gi'), ' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

function lineIsMapped(line: string, parsed: ParsedBeanOrderCustomer, sourceText?: string): boolean {
  const normalizedLine = normalizeMatchText(line);
  if (!normalizedLine) return true;

  if (sourceText && line === sourceText.trim()) {
    const hasMappedContent =
      Boolean(parsed.name && line.includes(parsed.name)) ||
      Boolean(parsed.phone && line.includes(parsed.phone)) ||
      Boolean(parsed.address.addressLine && line.includes(parsed.address.addressLine));
    if (hasMappedContent) return true;
  }

  const nameNorm = normalizeMatchText(parsed.name);
  if (nameNorm && normalizedLine === nameNorm) return true;

  const phoneDigits = parsed.phone.replace(/\D/g, '');
  if (phoneDigits) {
    const lineDigits = line.replace(/\D/g, '');
    if (lineDigits === phoneDigits) return true;
    if (line.includes(parsed.phone) || lineDigits.includes(phoneDigits)) {
      const textWithoutPhone = line.replace(/\d[\d\s.-]*/g, '').replace(/\s+/g, '').trim();
      const textNorm = normalizeMatchText(textWithoutPhone);
      if (!textWithoutPhone || (nameNorm && textNorm === nameNorm)) return true;
    }
  }

  const address = parsed.address;
  const addressPieces = [
    address.addressLine,
    address.subdistrict,
    address.district,
    address.province,
    address.postalCode,
  ].filter(Boolean);
  const combinedAddress = normalizeMatchText(addressPieces.join(' '));

  if (combinedAddress && (combinedAddress.includes(normalizedLine) || normalizedLine.includes(combinedAddress))) {
    return true;
  }

  if (address.addressLine && normalizeMatchText(address.addressLine).includes(normalizedLine)) {
    return true;
  }

  return false;
}

function looksLikeParsedAddressLine(line: string, parsed: ParsedBeanOrderCustomer): boolean {
  const { address } = parsed;
  if (!address.postalCode || !line.includes(address.postalCode)) return false;

  return Boolean(
    (address.subdistrict && line.includes(address.subdistrict)) ||
      (address.district && line.includes(address.district)) ||
      (address.province && line.includes(address.province)) ||
      line.includes(`ต.`) ||
      line.includes(`อ.`) ||
      line.includes(`จ.`),
  );
}

function finalizeParsedBeanOrderCustomer(result: ParsedBeanOrderCustomer): ParsedBeanOrderCustomer {
  const address = finalizeCustomerAddress(result.address);

  return {
    ...result,
    address,
    missingFields: collectMissingFields({
      name: result.name,
      phone: result.phone,
      addressLine: address.addressLine || address.postalCode,
    }),
  };
}

/** ตรวจว่าบ้านเลขที่ยังมีข้อมูลซ้ำกับฟิลด์พื้นที่หรือไม่ — ใช้ตัดสินใจให้ AI ช่วย refine */
export function addressNeedsAiRefine(result: ParsedBeanOrderCustomer): boolean {
  const { address } = finalizeParsedBeanOrderCustomer(result);
  const line = address.addressLine;
  if (!line.trim()) return false;

  if (address.postalCode && line.includes(address.postalCode)) return true;
  if (address.province && (line.includes(`จ.${address.province}`) || line.includes(`จังหวัด${address.province}`))) {
    return true;
  }
  if (address.district && (line.includes(`อ.${address.district}`) || line.includes(`อำเภอ${address.district}`))) {
    return true;
  }
  if (
    address.subdistrict &&
    (line.includes(`ต.${address.subdistrict}`) || line.includes(`ตำบล${address.subdistrict}`))
  ) {
    return true;
  }
  if (/(\S+(?:\s+\S+){1,5})\s+\1/.test(line)) return true;

  return false;
}

function mergeAddressLine(current: string, extra: string): string {
  const trimmedCurrent = current.trim();
  const trimmedExtra = extra.trim();
  if (!trimmedExtra) return trimmedCurrent;
  if (!trimmedCurrent) return trimmedExtra;
  if (trimmedCurrent.includes(trimmedExtra)) return trimmedCurrent;
  if (trimmedExtra.includes(trimmedCurrent)) return trimmedExtra;
  return `${trimmedExtra} ${trimmedCurrent}`;
}

function reconcileUnmappedPasteText(
  sourceText: string,
  parsed: ParsedBeanOrderCustomer,
  options: { erpFormat?: boolean } = {},
): ParsedBeanOrderCustomer {
  if (options.erpFormat) return parsed;

  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const unmappedLines = lines.filter(
    (line) =>
      !lineIsMapped(line, parsed, sourceText) && !looksLikeParsedAddressLine(line, parsed),
  );

  let mergedAddressLine = parsed.address.addressLine.trim();

  if (unmappedLines.length > 0) {
    const extra = unmappedLines.join(' ').trim();
    mergedAddressLine = mergeAddressLine(mergedAddressLine, extra);
  }

  if (!lines.length && sourceText.includes('\n') === false) {
    let remaining = sourceText.trim();
    for (const fragment of [
      parsed.name,
      parsed.phone,
      parsed.address.addressLine,
      parsed.address.subdistrict,
      parsed.address.district,
      parsed.address.province,
      parsed.address.postalCode,
    ]) {
      if (!fragment) continue;
      remaining = remaining.replace(new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
    }

    remaining = remaining
      .replace(/\b(เบอร์|โทร|ที่|ที่อยู่|ลูกค้า|ชื่อ|ผู้รับ)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const leftoverWords = remaining
      .split(/\s+/)
      .filter((word) => word && !PASTE_NOISE_WORDS.has(word));

    if (leftoverWords.length > 0) {
      mergedAddressLine = mergeAddressLine(mergedAddressLine, leftoverWords.join(' '));
    }
  }

  if (mergedAddressLine === parsed.address.addressLine.trim()) return parsed;

  const address = { ...parsed.address, addressLine: mergedAddressLine };

  return {
    ...parsed,
    address,
    missingFields: collectMissingFields({
      name: parsed.name,
      phone: parsed.phone,
      addressLine: mergedAddressLine || parsed.address.postalCode,
    }),
  };
}

function parseInlineFreeformText(text: string): ParsedBeanOrderCustomer {
  let working = text.trim();
  let name = '';
  let phone = '';
  let addressLine = '';

  const phoneResult = extractThaiPhone(working);
  if (phoneResult) {
    phone = phoneResult.phone;
    working = working.replace(/0\d[\d\s.-]{7,12}\d/, ' ').replace(/\s+/g, ' ').trim();
  }

  const addressMatch = working.match(/(?:ที่|ที่อยู่)\s+(.+)/i);
  if (addressMatch) {
    addressLine = addressMatch[1].replace(/\s*(ครับ|ค่ะ|นะ|คะ)\s*$/i, '').trim();
    working = working.replace(addressMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  const nameMatch = working.match(/(?:ให้|คุณ)\s*([^\d,]+?)(?:\s+(?:เบอร์|โทร|ที่|ที่อยู่)\b|$)/i);
  if (nameMatch) {
    name = cleanParsedName(nameMatch[1]);
  } else {
    const cleaned = cleanParsedName(working);
    if (cleaned && cleaned.length <= 40 && looksLikePersonName(cleaned)) {
      name = cleaned;
    }
  }

  return buildParsedBeanOrderCustomer({
    name,
    phone,
    addressLine,
    parseSource: 'rules',
    sourceText: text,
  });
}

function parseFreeformCustomerText(text: string): ParsedBeanOrderCustomer {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return parseInlineFreeformText(text);
  }

  let name = '';
  let phone = '';
  const addressParts: string[] = [];

  for (const line of lines) {
    const labeledName = line.match(/^(?:ชื่อ|ลูกค้า|ผู้รับ)\s*[:：]\s*(.+)$/i)?.[1]?.trim();
    if (labeledName) {
      name = labeledName;
      continue;
    }

    const labeledPhone = line.match(/^(?:เบอร์|โทร|tel)\s*[:：]\s*(.+)$/i)?.[1]?.trim();
    if (labeledPhone) {
      const extracted = extractThaiPhone(labeledPhone);
      if (extracted) phone = extracted.phone;
      continue;
    }

    const labeledAddress = line.match(/^(?:ที่อยู่|ที่อยู่จัดส่ง|address)\s*[:：]\s*(.+)$/i)?.[1]?.trim();
    if (labeledAddress) {
      addressParts.push(labeledAddress);
      continue;
    }

    const phoneOnLine = extractThaiPhone(line);
    if (phoneOnLine) {
      const lineDigits = line.replace(/\D/g, '');
      if (lineDigits.length <= phoneOnLine.phone.length + 2) {
        phone = phoneOnLine.phone;
        continue;
      }
      if (phoneOnLine.remainder && !name && looksLikePersonName(phoneOnLine.remainder)) {
        phone = phoneOnLine.phone;
        name = phoneOnLine.remainder;
        continue;
      }
    }

    if (!name && looksLikePersonName(line)) {
      name = line;
      continue;
    }

    addressParts.push(line);
  }

  return buildParsedBeanOrderCustomer({
    name,
    phone,
    addressLine: addressParts.join(' '),
    parseSource: 'rules',
    sourceText: text,
  });
}

export function buildParsedBeanOrderCustomer(input: {
  name: string;
  phone: string;
  addressLine: string;
  province?: string | null;
  postalCode?: string | null;
  parseSource: BeanOrderCustomerParseSource;
  sourceText?: string;
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

  let result: ParsedBeanOrderCustomer = {
    name,
    phone,
    address,
    parseSource: input.parseSource,
    missingFields: collectMissingFields({ name, phone, addressLine: address.addressLine || addressLine }),
  };

  if (input.sourceText) {
    result = reconcileUnmappedPasteText(input.sourceText, result, {
      erpFormat: hasErpCustomerLabels(input.sourceText),
    });
  }

  return finalizeParsedBeanOrderCustomer(result);
}

/** แยกชื่อ / เบอร์ / ที่อยู่จากข้อความคัดลอกออเดอร์ (รูปแบบ label คงที่ หรือข้อความอิสระ) */
export function parseBeanOrderCustomerText(text: string): ParsedBeanOrderCustomer {
  if (hasErpCustomerLabels(text)) {
    const name = extractLabeledValue(text, 'ลูกค้า');
    const phone = extractLabeledValue(text, 'เบอร์');
    const addressLine =
      extractLabeledValue(text, 'ที่อยู่จัดส่ง') ?? extractLabeledValue(text, 'ที่อยู่');

    return buildParsedBeanOrderCustomer({
      name,
      phone,
      addressLine,
      parseSource: 'rules',
      sourceText: text,
    });
  }

  return parseFreeformCustomerText(text);
}
