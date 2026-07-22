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
