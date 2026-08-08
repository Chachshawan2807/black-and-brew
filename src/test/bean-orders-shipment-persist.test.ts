import { describe, expect, test } from 'vitest';
import {
  shouldMarkBeanOrderShipped,
  shouldPersistBeanOrderShipment,
} from '@/lib/bean-orders/shipment-persist';

describe('shouldPersistBeanOrderShipment', () => {
  test('persists when carrier is selected on create without tracking number', () => {
    expect(
      shouldPersistBeanOrderShipment({
        carrierCode: 'flashexpress',
        customCarrierLabel: '',
        trackingNumber: '',
        isEdit: false,
        hasInitialShipment: false,
      }),
    ).toBe(true);
  });

  test('persists when tracking number is provided', () => {
    expect(
      shouldPersistBeanOrderShipment({
        carrierCode: 'kerryexpress-th',
        customCarrierLabel: '',
        trackingNumber: 'TH123',
        isEdit: false,
        hasInitialShipment: false,
      }),
    ).toBe(true);
  });

  test('persists on edit when shipment already exists', () => {
    expect(
      shouldPersistBeanOrderShipment({
        carrierCode: 'kerryexpress-th',
        customCarrierLabel: '',
        trackingNumber: '',
        isEdit: true,
        hasInitialShipment: true,
      }),
    ).toBe(true);
  });
});

describe('shouldMarkBeanOrderShipped', () => {
  test('marks shipped when tracking number is provided', () => {
    expect(
      shouldMarkBeanOrderShipped({
        trackingNumber: 'TH123',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(true);
  });

  test('keeps pending when only carrier is selected', () => {
    expect(
      shouldMarkBeanOrderShipped({
        trackingNumber: '',
        fulfillmentStatus: 'pending',
      }),
    ).toBe(false);
  });

  test('uses ship flow when order is already shipped', () => {
    expect(
      shouldMarkBeanOrderShipped({
        trackingNumber: '',
        fulfillmentStatus: 'shipped',
      }),
    ).toBe(true);
  });
});
