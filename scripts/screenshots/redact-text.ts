export type StaffAliasConfig = {
  staffNames: Record<string, string>;
  customerPlaceholder: string;
  phonePattern: string;
};

export function applyStaffAliases(text: string, staffNames: Record<string, string>): string {
  let out = text;
  const entries = Object.entries(staffNames).sort((a, b) => b[0].length - a[0].length);
  for (const [real, alias] of entries) {
    out = out.split(real).join(alias);
  }
  return out;
}

export function redactPhones(text: string, phonePattern: string): string {
  const re = new RegExp(phonePattern, 'g');
  return text.replace(re, '***-***-****');
}

export function redactDisplayText(text: string, config: StaffAliasConfig): string {
  const withStaff = applyStaffAliases(text, config.staffNames);
  return redactPhones(withStaff, config.phonePattern);
}
