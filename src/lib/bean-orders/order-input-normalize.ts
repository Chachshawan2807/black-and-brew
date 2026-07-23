import type { BeanOrderLineInput, WeightUnit } from '@/lib/bean-orders/types';

export const PICKUP_CUSTOMER_FALLBACK_NAME = 'ลูกค้ารับเอง';
export const PREP_ONLY_DEFAULT_WEIGHT_VALUE = 1;
export const PREP_ONLY_DEFAULT_WEIGHT_UNIT: WeightUnit = 'g';

export function resolveBeanOrderRecipientName(
  recipientName: string | undefined,
  customerNameFallback?: string,
): string {
  const fromRecipient = (recipientName ?? '').trim();
  if (fromRecipient) return fromRecipient;
  const fromCustomer = (customerNameFallback ?? '').trim();
  if (fromCustomer) return fromCustomer;
  return PICKUP_CUSTOMER_FALLBACK_NAME;
}

export function normalizeBeanOrderLineInput(line: {
  inventoryItemId: string;
  weightValue?: number;
  weightUnit?: WeightUnit;
  unitPricePerKg?: number;
}): BeanOrderLineInput {
  const weightValue =
    typeof line.weightValue === 'number' && line.weightValue > 0
      ? line.weightValue
      : PREP_ONLY_DEFAULT_WEIGHT_VALUE;

  return {
    inventoryItemId: line.inventoryItemId,
    weightValue,
    weightUnit: line.weightUnit ?? PREP_ONLY_DEFAULT_WEIGHT_UNIT,
    unitPricePerKg:
      typeof line.unitPricePerKg === 'number' && line.unitPricePerKg >= 0
        ? line.unitPricePerKg
        : 0,
  };
}

export function normalizeBeanOrderLinesForSave(
  lines: Array<{
    inventoryItemId: string;
    weightValue?: number;
    weightUnit?: WeightUnit;
    unitPricePerKg?: number;
  }>,
): BeanOrderLineInput[] {
  return lines
    .filter((line) => line.inventoryItemId)
    .map(normalizeBeanOrderLineInput);
}

export type BeanOrderDraftInput = {
  customerId?: string | null;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientProvince?: string;
  recipientPostalCode?: string;
  discountBaht?: number;
  shippingBaht?: number;
  notes?: string;
  lines: Array<{
    inventoryItemId: string;
    weightValue?: number;
    weightUnit?: WeightUnit;
    unitPricePerKg?: number;
  }>;
};

export function prepareBeanOrderInput(
  input: BeanOrderDraftInput,
): { success: true; data: BeanOrderDraftInput & { recipientName: string; recipientAddress: string; lines: BeanOrderLineInput[] } } | { success: false; error: string } {
  const lines = normalizeBeanOrderLinesForSave(input.lines);
  if (lines.length === 0) {
    return { success: false, error: 'เลือกสินค้าอย่างน้อย 1 รายการ' };
  }

  return {
    success: true,
    data: {
      ...input,
      recipientName: resolveBeanOrderRecipientName(input.recipientName),
      recipientAddress: (input.recipientAddress ?? '').trim(),
      lines,
    },
  };
}
