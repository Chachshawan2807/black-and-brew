export type WeightUnit = 'g' | 'kg';

export type PaymentStatus = 'unpaid' | 'paid';
export type FulfillmentStatus = 'pending' | 'shipped';
export type DeliveryType = 'parcel' | 'same_day';

export type StatusHistoryEntry = {
  at: string;
  by: string;
  action: string;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  note?: string;
};

export type BeanOrderLineInput = {
  inventoryItemId: string;
  weightValue: number;
  weightUnit: WeightUnit;
  unitPricePerKg: number;
};

export type BeanOrderTotals = {
  subtotalBaht: number;
  discountBaht: number;
  shippingBaht: number;
  totalBaht: number;
};
