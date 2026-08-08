import { describe, expect, test } from 'vitest';
import {
  shouldMarkBeanOrderShipped,
  shouldPersistBeanOrderShipment,
  validateBeanOrderShipmentCarrier,
  BEAN_ORDER_CARRIER_REQUIRED_ERROR,
} from '@/lib/bean-orders/shipment-persist';

describe('validateBeanOrderShipmentCarrier', () => {
  test('rejects tracking-only save when other carrier has no label', () => {
    const result = validateBeanOrderShipmentCarrier({
      carrierCode: 'other',
      customCarrierLabel: '',
    });
    expect(result).toEqual({ ok: false, error: BEAN_ORDER_CARRIER_REQUIRED_ERROR });
  });

  test('rejects empty carrier code', () => {
    const result = validateBeanOrderShipmentCarrier({
      carrierCode: '',
      customCarrierLabel: '',
    });
    expect(result).toEqual({ ok: false, error: BEAN_ORDER_CARRIER_REQUIRED_ERROR });
  });

  test('accepts known carrier code', () => {
    const result = validateBeanOrderShipmentCarrier({
      carrierCode: 'kerryexpress-th',
      customCarrierLabel: '',
    });
    expect(result).toEqual({ ok: true, resolvedCarrierCode: 'kerryexpress-th' });
  });

  test('accepts custom carrier label for other', () => {
    const result = validateBeanOrderShipmentCarrier({
      carrierCode: 'other',
      customCarrierLabel: 'Grab',
    });
    expect(result).toEqual({ ok: true, resolvedCarrierCode: 'Grab' });
  });
});

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
