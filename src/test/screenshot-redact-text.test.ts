import { describe, expect, test } from 'vitest';
import {
  applyStaffAliases,
  redactDisplayText,
  redactPhones,
  type StaffAliasConfig,
} from '../../scripts/screenshots/redact-text';

const config: StaffAliasConfig = {
  staffNames: { ชัช: 'Staff F', นิต้า: 'Staff A' },
  customerPlaceholder: 'Customer ***',
  phonePattern: '0[0-9]{1,2}[-\\s]?[0-9]{3}[-\\s]?[0-9]{4}',
};

describe('applyStaffAliases', () => {
  test('replaces staff names', () => {
    expect(applyStaffAliases('ชัช and นิต้า', config.staffNames)).toBe('Staff F and Staff A');
  });
});

describe('redactPhones', () => {
  test('masks Thai mobile patterns', () => {
    expect(redactPhones('call 081-234-5678', config.phonePattern)).toBe('call ***-***-****');
  });
});

describe('redactDisplayText', () => {
  test('applies staff then phone', () => {
    expect(redactDisplayText('ชัช 0812345678', config)).toBe('Staff F ***-***-****');
  });
});
