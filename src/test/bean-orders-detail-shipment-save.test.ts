import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getBeanOrderDetailShipmentSaveButtonLabel,
  shouldShowBeanOrderDetailShipmentSaveButton,
} from '@/lib/bean-orders/detail-shipment-save-ui';

describe('bean order detail shipment save button', () => {
  test('hides save button until tracking is entered or order is already shipped', () => {
    expect(
      shouldShowBeanOrderDetailShipmentSaveButton({
        fulfillmentStatus: 'pending',
        trackingNumber: '',
      }),
    ).toBe(false);
    expect(
      shouldShowBeanOrderDetailShipmentSaveButton({
        fulfillmentStatus: 'pending',
        trackingNumber: 'TH123',
      }),
    ).toBe(true);
    expect(
      shouldShowBeanOrderDetailShipmentSaveButton({
        fulfillmentStatus: 'shipped',
        trackingNumber: '',
      }),
    ).toBe(true);
  });

  test('keeps tracking save labels separate from carrier auto-save', () => {
    expect(getBeanOrderDetailShipmentSaveButtonLabel('pending')).toBe('บันทึกการจัดส่ง');
    expect(getBeanOrderDetailShipmentSaveButtonLabel('shipped')).toBe('อัปเดตการจัดส่ง');
  });
});

describe('bean order detail carrier auto-save', () => {
  test('persists carrier channel when select changes', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    expect(source).toContain('async function autoSaveCarrierChannel');
    expect(source).toContain('function handleCarrierCodeChange');
    expect(source).toMatch(/onCarrierCodeChange=\{handleCarrierCodeChange\}/);
    expect(source).toContain('saveBeanOrderShipmentPlan');
    expect(source).toContain('shouldShowBeanOrderDetailShipmentSaveButton');
  });
});
