import { searchAddress } from 'thai-postal-code';

export type ThaiPostalAreaOption = {
  id: string;
  label: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

export function normalizeThaiPostalCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5);
}

export function lookupThaiPostalAreas(postalCode: string): ThaiPostalAreaOption[] {
  const normalized = normalizeThaiPostalCode(postalCode);
  if (normalized.length !== 5) return [];

  const rows = searchAddress(normalized, 100).filter((row) => row.postalCode === normalized);
  const seen = new Set<string>();

  return rows.flatMap((row) => {
    const id = `${row.subdistrictNameTh}|${row.districtNameTh}|${row.provinceNameTh}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      label: `${row.subdistrictNameTh} · ${row.districtNameTh} · ${row.provinceNameTh}`,
      subdistrict: row.subdistrictNameTh,
      district: row.districtNameTh,
      province: row.provinceNameTh,
      postalCode: row.postalCode,
    }];
  });
}

export function formatThaiPostalAddressLine(input: {
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}): string {
  const detail = input.addressLine.trim();
  const locality = [
    input.subdistrict,
    input.district,
    input.province,
    input.postalCode,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');

  return [detail, locality].filter(Boolean).join(' ');
}

type PostalRow = {
  provinceNameTh: string;
  provinceNameEn: string;
  districtNameTh: string;
  districtNameEn: string;
  subdistrictNameTh: string;
  subdistrictNameEn: string;
};

function normalizeEnKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isThaiText(value: string): boolean {
  return /[\u0E00-\u0E7F]/.test(value);
}

function matchesEnName(candidate: string, query: string): boolean {
  const candidateKey = normalizeEnKey(candidate);
  const queryKey = normalizeEnKey(query);
  if (!candidateKey || !queryKey) return false;
  return candidateKey === queryKey || candidateKey.includes(queryKey) || queryKey.includes(candidateKey);
}

function searchPostalRows(query: string, limit = 80): PostalRow[] {
  if (!query.trim()) return [];
  return searchAddress(query, limit) as PostalRow[];
}

function findProvinceTh(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  if (isThaiText(name)) return name.trim();

  const compact = normalizeEnKey(name);
  const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  const queries = [...new Set([name, spaced].filter(Boolean))];

  for (const query of queries) {
    const rows = searchPostalRows(query, 80);
    const match = rows.find((row) => normalizeEnKey(row.provinceNameEn) === compact);
    if (match) return match.provinceNameTh;
  }

  if (compact.length >= 4) {
    const probe = searchPostalRows(name.slice(0, Math.min(6, Math.ceil(name.length / 2))), 100);
    const match = probe.find((row) => normalizeEnKey(row.provinceNameEn) === compact);
    if (match) return match.provinceNameTh;
  }

  return null;
}

function findPostalRow(
  name: string,
  provinceTh: string | null,
  prefer: 'subdistrict' | 'district',
): PostalRow | null {
  const rows = searchPostalRows(name, 80).filter(
    (row) => !provinceTh || row.provinceNameTh === provinceTh,
  );

  if (prefer === 'district') {
    return (
      rows.find((row) => matchesEnName(row.districtNameEn, name)) ??
      rows.find((row) => matchesEnName(row.subdistrictNameEn, name)) ??
      null
    );
  }

  return rows.find((row) => matchesEnName(row.subdistrictNameEn, name)) ?? null;
}

/** แปลงชื่อตำบล/อำเภอ/จังหวัดจากข้อมูลขนส่ง (มักเป็นภาษาอังกฤษ) เป็นชื่อไทยจาก thai-postal-code */
export function resolveThaiAdminAreaNames(parts: {
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
}): {
  subdistrict: string | null;
  district: string | null;
  province: string | null;
} {
  const rawSubdistrict = parts.subdistrict?.trim() || null;
  const rawDistrict = parts.district?.trim() || null;
  const rawProvince = parts.province?.trim() || null;

  const provinceTh =
    (rawProvince && isThaiText(rawProvince) ? rawProvince : null) ?? findProvinceTh(rawProvince);

  let subdistrictTh = rawSubdistrict && isThaiText(rawSubdistrict) ? rawSubdistrict : null;
  let districtTh = rawDistrict && isThaiText(rawDistrict) ? rawDistrict : null;

  if (!districtTh && rawDistrict) {
    const row = findPostalRow(rawDistrict, provinceTh, 'district');
    if (row) districtTh = row.districtNameTh;
  }

  if (!subdistrictTh && rawSubdistrict) {
    const row = findPostalRow(rawSubdistrict, provinceTh, 'subdistrict');
    if (row) {
      subdistrictTh = row.subdistrictNameTh;
      if (!districtTh) districtTh = row.districtNameTh;
    }
  }

  return {
    subdistrict: subdistrictTh ?? rawSubdistrict,
    district: districtTh ?? rawDistrict,
    province: provinceTh ?? rawProvince,
  };
}

/** จัดรูปแบบตำบล/อำเภอ/จังหวัดเป็นข้อความไทยแบบย่อ (ต./อ./จ.) */
export function formatThaiAdminAreaLabel(parts: {
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
}): string {
  const resolved = resolveThaiAdminAreaNames(parts);
  const labels: string[] = [];

  if (resolved.subdistrict) labels.push(`ต.${resolved.subdistrict}`);
  if (resolved.district) labels.push(`อ.${resolved.district}`);
  if (resolved.province) labels.push(`จ.${resolved.province}`);

  return labels.join(' ');
}
