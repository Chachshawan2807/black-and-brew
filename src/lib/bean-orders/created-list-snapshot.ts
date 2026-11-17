import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import { computeLineTotal, computeOrderTotals } from '@/lib/bean-orders/pricing';
import type { WeightUnit } from '@/lib/bean-orders/types';

export const BEAN_ORDER_CREATED_ROWS_KEY = 'bb-bean-order-created-rows';

const MAX_CREATED_PATCHES = 8;

export type CreatedBeanOrderListInput = {
  id: string;
  orderNo: string;
  createdAt: string;
  customerName: string | null;
  recipientName: string;
  recipientPhone: string | null;
  recipientAddress: string;
  recipientProvince: string | null;
  recipientPostalCode: string | null;
  discountBaht: number;
  shippingBaht: number;
  notes: string | null;
  lines: Array<{
    itemName: string;
    weightValue: number;
    weightUnit: WeightUnit;
    unitPricePerKg: number;
  }>;
  paymentStatus: 'unpaid' | 'paid';
  slipUploadedAt: string | null;
  fulfillmentStatus: 'pending' | 'shipped';
  carrierCode: string | null;
  trackingNumber: string | null;
};

export function buildCreatedBeanOrderListRow(input: CreatedBeanOrderListInput): BeanOrderListRow {
  const lines = input.lines.map((line) => ({
    itemName: line.itemName,
    weightValue: line.weightValue,
    weightUnit: line.weightUnit,
    unitPricePerKg: line.unitPricePerKg,
    lineTotalBaht: computeLineTotal(line.weightValue, line.weightUnit, line.unitPricePerKg),
  }));
  const totals = computeOrderTotals(
    lines.map((line) => ({
      inventoryItemId: '',
      weightValue: line.weightValue,
      weightUnit: line.weightUnit,
      unitPricePerKg: line.unitPricePerKg,
    })),
    input.discountBaht,
    input.shippingBaht,
  );

  return {
    id: input.id,
    orderNo: input.orderNo,
    customerName: input.customerName,
    recipientName: input.recipientName,
    recipientPhone: input.recipientPhone,
    recipientAddress: input.recipientAddress,
    recipientProvince: input.recipientProvince,
    recipientPostalCode: input.recipientPostalCode,
    subtotalBaht: totals.subtotalBaht,
    discountBaht: totals.discountBaht,
    shippingBaht: totals.shippingBaht,
    totalBaht: totals.totalBaht,
    notes: input.notes,
    lines,
    paymentStatus: input.paymentStatus,
    fulfillmentStatus: input.fulfillmentStatus,
    slipUploadedAt: input.slipUploadedAt,
    deliveryType: input.carrierCode ? 'parcel' : null,
    carrierCode: input.carrierCode,
    trackingNumber: input.trackingNumber,
    trackingStatus: null,
    cancelledAt: null,
    createdAt: input.createdAt,
  };
}

function readCreatedPatches(): BeanOrderListRow[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(BEAN_ORDER_CREATED_ROWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is BeanOrderListRow =>
        Boolean(row) &&
        typeof row === 'object' &&
        typeof (row as BeanOrderListRow).id === 'string' &&
        typeof (row as BeanOrderListRow).orderNo === 'string',
    );
  } catch {
    return [];
  }
}

function writeCreatedPatches(rows: BeanOrderListRow[]): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (rows.length === 0) {
      sessionStorage.removeItem(BEAN_ORDER_CREATED_ROWS_KEY);
      return;
    }
    sessionStorage.setItem(
      BEAN_ORDER_CREATED_ROWS_KEY,
      JSON.stringify(rows.slice(0, MAX_CREATED_PATCHES)),
    );
  } catch {
    // Private browsing or quota: the list still refreshes after a full reload.
  }
}

export function stashBeanOrderCreatedPatch(row: BeanOrderListRow): void {
  const existing = readCreatedPatches().filter((patch) => patch.id !== row.id);
  writeCreatedPatches([row, ...existing]);
}

/** Keep just-created rows visible when the list route is still serving a stale payload. */
export function mergeBeanOrderCreatedPatches(orders: BeanOrderListRow[]): BeanOrderListRow[] {
  const patches = readCreatedPatches();
  if (patches.length === 0) return orders;

  const presentIds = new Set(orders.map((order) => order.id));
  const pending = patches.filter((patch) => !presentIds.has(patch.id));
  if (pending.length !== patches.length) writeCreatedPatches(pending);
  if (pending.length === 0) return orders;

  const pendingSorted = pending.toSorted(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return [...pendingSorted, ...orders];
}
