import { describe, expect, test } from 'vitest';
import {
  hasBeanOrderSavedTrackingNumber,
  isBeanOrderShipmentWorkflowClosed,
} from '@/lib/bean-orders/shipment-deliver-ui';
import { shouldShowDeliveredButton } from '@/lib/bean-orders/order-status';

describe('shipment deliver ui', () => {
  test('saved tracking closes parcel workflow without deliver button', () => {
    expect(hasBeanOrderSavedTrackingNumber('KEX1')).toBe(true);
    expect(shouldShowDeliveredButton('pending', null, 'KEX1')).toBe(false);
    expect(
      isBeanOrderShipmentWorkflowClosed({
        fulfillmentStatus: 'pending',
        trackingNumber: 'KEX1',
      }),
    ).toBe(true);
  });

  test('no saved tracking keeps deliver button until confirmed', () => {
    expect(shouldShowDeliveredButton('pending', null, null)).toBe(true);
    expect(shouldShowDeliveredButton('shipped', null, '')).toBe(true);
  });

  test('delivered tracking status hides deliver button', () => {
    expect(shouldShowDeliveredButton('shipped', 'delivered', null)).toBe(false);
    expect(
      isBeanOrderShipmentWorkflowClosed({
        fulfillmentStatus: 'shipped',
        trackingStatus: 'delivered',
      }),
    ).toBe(true);
  });

  test('form empty does not affect deliver visibility when db has tracking', () => {
    expect(shouldShowDeliveredButton('shipped', null, 'KEX123')).toBe(false);
  });
});