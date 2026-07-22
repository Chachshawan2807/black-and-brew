import type { WeightUnit } from './types';
import {
  addressProfileKey,
  dedupeAddressProfiles,
  type ThaiPostalAddressValue,
} from './address';

export type BeanOrderLinePreset = {
  inventoryItemId: string;
  weightValue: number;
  weightUnit: WeightUnit;
  unitPricePerKg: number;
};

export type BeanOrderFormSuggestions = {
  senderProfiles: ThaiPostalAddressValue[];
  recipientProfiles: ThaiPostalAddressValue[];
  linePresets: BeanOrderLinePreset[];
  shippingBahtValues: number[];
  discountBahtValues: number[];
  notes: string[];
};

type AddressField = keyof Pick<
  ThaiPostalAddressValue,
  'name' | 'phone' | 'postalCode' | 'addressLine'
>;

export function filterAddressProfilesByField(
  profiles: ThaiPostalAddressValue[],
  field: AddressField,
  query: string,
): ThaiPostalAddressValue[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return profiles.filter((profile) => profile[field].toLowerCase().includes(q));
}

export function filterStringSuggestions(values: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  return values.filter((value) => {
    const trimmed = value.trim();
    if (!trimmed.toLowerCase().includes(q)) return false;
    if (seen.has(trimmed)) return false;
    seen.add(trimmed);
    return true;
  });
}

export function filterNumberSuggestions(values: number[], query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const seen = new Set<string>();
  return values
    .map((value) => String(value))
    .filter((value) => value.includes(q))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

export function profilesMatchingName(
  profiles: ThaiPostalAddressValue[],
  name: string,
): ThaiPostalAddressValue[] {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return [];
  return dedupeAddressProfiles(
    profiles.filter((profile) => profile.name.trim().toLowerCase() === normalized),
  );
}

export function mergeFormSuggestions(input: {
  senderProfiles: ThaiPostalAddressValue[];
  recipientProfiles: ThaiPostalAddressValue[];
  linePresets: BeanOrderLinePreset[];
  shippingBahtValues: number[];
  discountBahtValues: number[];
  notes: string[];
}): BeanOrderFormSuggestions {
  return {
    senderProfiles: dedupeAddressProfiles(input.senderProfiles),
    recipientProfiles: dedupeAddressProfiles(input.recipientProfiles),
    linePresets: dedupeLinePresets(input.linePresets),
    shippingBahtValues: dedupeNumbers(input.shippingBahtValues),
    discountBahtValues: dedupeNumbers(input.discountBahtValues),
    notes: dedupeStrings(input.notes),
  };
}

function dedupeLinePresets(presets: BeanOrderLinePreset[]): BeanOrderLinePreset[] {
  const seen = new Set<string>();
  return presets.filter((preset) => {
    const key = [
      preset.inventoryItemId,
      preset.weightValue,
      preset.weightUnit,
      preset.unitPricePerKg,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeNumbers(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value)))];
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

export function linePresetsForItem(
  presets: BeanOrderLinePreset[],
  inventoryItemId: string,
  query: string,
): BeanOrderLinePreset[] {
  if (!inventoryItemId) return [];
  const q = query.trim();
  return presets.filter((preset) => {
    if (preset.inventoryItemId !== inventoryItemId) return false;
    if (!q) return false;
    const price = String(preset.unitPricePerKg);
    const weight = String(preset.weightValue);
    return price.includes(q) || weight.includes(q);
  });
}

export function findProfileByFieldValue(
  profiles: ThaiPostalAddressValue[],
  field: AddressField,
  value: string,
): ThaiPostalAddressValue | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return profiles.find((profile) => profile[field].trim().toLowerCase() === normalized);
}

export function uniqueFieldValues(
  profiles: ThaiPostalAddressValue[],
  field: AddressField,
  query: string,
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  return profiles.flatMap((profile) => {
    const value = profile[field].trim();
    if (!value.toLowerCase().includes(q) || seen.has(value)) return [];
    seen.add(value);
    return [value];
  });
}

export { addressProfileKey };
