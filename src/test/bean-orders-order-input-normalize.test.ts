import { describe, expect, test } from 'vitest';
import {
  normalizeBeanOrderLineInput,
  normalizeBeanOrderLinesForSave,
  prepareBeanOrderInput,
  PICKUP_CUSTOMER_FALLBACK_NAME,
  PREP_ONLY_DEFAULT_WEIGHT_VALUE,
  resolveBeanOrderRecipientName,
} from '@/lib/bean-orders/order-input-normalize';

describe('resolveBeanOrderRecipientName', () => {
  test('prefers recipient name, then customer query, then pickup fallback', () => {
    expect(resolveBeanOrderRecipientName('สมชาย', 'สมหญิง')).toBe('สมชาย');
    expect(resolveBeanOrderRecipientName('', 'สมหญิง')).toBe('สมหญิง');
    expect(resolveBeanOrderRecipientName('', '')).toBe(PICKUP_CUSTOMER_FALLBACK_NAME);
  });
});

describe('normalizeBeanOrderLineInput', () => {
  test('defaults missing weight and price for prep-only lines', () => {
    expect(
      normalizeBeanOrderLineInput({
        inventoryItemId: '00000000-0000-4000-8000-000000000001',
      }),
    ).toEqual({
      inventoryItemId: '00000000-0000-4000-8000-000000000001',
      weightValue: PREP_ONLY_DEFAULT_WEIGHT_VALUE,
      weightUnit: 'g',
      unitPricePerKg: 0,
    });
  });

  test('keeps explicit weight and price', () => {
    expect(
      normalizeBeanOrderLineInput({
        inventoryItemId: '00000000-0000-4000-8000-000000000001',
        weightValue: 250,
        weightUnit: 'g',
        unitPricePerKg: 420,
      }),
    ).toEqual({
      inventoryItemId: '00000000-0000-4000-8000-000000000001',
      weightValue: 250,
      weightUnit: 'g',
      unitPricePerKg: 420,
    });
  });
});

describe('normalizeBeanOrderLinesForSave', () => {
  test('drops blank lines and normalizes the rest', () => {
    expect(
      normalizeBeanOrderLinesForSave([
        { inventoryItemId: '' },
        { inventoryItemId: '00000000-0000-4000-8000-000000000002', weightValue: 500, weightUnit: 'g' },
      ]),
    ).toEqual([
      {
        inventoryItemId: '00000000-0000-4000-8000-000000000002',
        weightValue: 500,
        weightUnit: 'g',
        unitPricePerKg: 0,
      },
    ]);
  });
});

describe('prepareBeanOrderInput', () => {
  test('requires at least one product line', () => {
    expect(prepareBeanOrderInput({ lines: [{ inventoryItemId: '' }] })).toEqual({
      success: false,
      error: 'เลือกสินค้าอย่างน้อย 1 รายการ',
    });
  });

  test('fills pickup defaults for minimal draft', () => {
    const result = prepareBeanOrderInput({
      lines: [{ inventoryItemId: '00000000-0000-4000-8000-000000000003' }],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.recipientName).toBe(PICKUP_CUSTOMER_FALLBACK_NAME);
    expect(result.data.recipientAddress).toBe('');
    expect(result.data.lines[0]?.weightValue).toBe(PREP_ONLY_DEFAULT_WEIGHT_VALUE);
  });
});
