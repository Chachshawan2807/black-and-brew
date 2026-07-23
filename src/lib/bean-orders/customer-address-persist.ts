import { dedupeAddressProfiles, type ThaiPostalAddressValue } from './address';

export type BeanCustomerAddressInput = {
  recipientName: string;
  recipientPhone?: string;
  recipientAddress: string;
  recipientProvince?: string;
  recipientPostalCode?: string;
};

export type BeanCustomerAddressRecord = {
  addressLine: string;
  province?: string | null;
  postalCode?: string | null;
};

export function shouldPersistCustomerAddress(input: {
  recipientAddress: string;
  recipientName?: string;
}): boolean {
  return Boolean(input.recipientAddress.trim() && (input.recipientName ?? '').trim());
}

export function normalizeCustomerAddressKey(input: BeanCustomerAddressRecord): string {
  return [
    input.addressLine.trim().toLowerCase().replace(/\s+/g, ' '),
    (input.postalCode ?? '').trim(),
    (input.province ?? '').trim().toLowerCase(),
  ].join('|');
}

export function customerAddressAlreadyExists(
  existing: BeanCustomerAddressRecord[],
  candidate: BeanCustomerAddressRecord,
): boolean {
  const key = normalizeCustomerAddressKey(candidate);
  return existing.some((row) => normalizeCustomerAddressKey(row) === key);
}

export function mergeCustomerAddressProfiles(
  savedProfiles: ThaiPostalAddressValue[],
  historyProfiles: ThaiPostalAddressValue[],
): ThaiPostalAddressValue[] {
  return dedupeAddressProfiles([...savedProfiles, ...historyProfiles]);
}
