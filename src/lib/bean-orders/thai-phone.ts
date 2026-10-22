const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

export function normalizeThaiPhoneNumber(value: string): string {
  const digits = value
    .replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
    .replace(/\D/g, '');

  const localNumber = digits.startsWith('0066')
    ? `0${digits.slice(4)}`
    : digits.startsWith('66') && digits.length > 10
      ? `0${digits.slice(2)}`
      : digits;

  return localNumber.slice(0, 10);
}

export function formatThaiPhoneNumber(value: string): string {
  const digits = normalizeThaiPhoneNumber(value);
  if (digits.length < 4) return digits;

  if (digits.startsWith('02')) {
    const subscriberCodeLength = digits.length === 10 ? 4 : 3;
    return [digits.slice(0, 2), digits.slice(2, 2 + subscriberCodeLength), digits.slice(2 + subscriberCodeLength)]
      .filter(Boolean)
      .join('-');
  }

  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)]
    .filter(Boolean)
    .join('-');
}
