import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getBeanOrderDetailShipmentSaveButtonLabel,
  isBeanOrderDetailTrackingDirty,
  shouldShowBeanOrderDetailShipmentSaveButton,
} from '@/lib/bean-orders/detail-shipment-save-ui';

describe('bean order detail shipment save button', () => {
  test('shows update only when tracking differs from saved', () => {
    expect(
      shouldShowBeanOrderDetailShipmentSaveButton({
        trackingNumber: '',
        savedTrackingNumber: null,
      }),
    ).toBe(false);
    expect(
      shouldShowBeanOrderDetailShipmentSaveButton({
        trackingNumber: 'TH123',
        savedTrackingNumber: null,
      }),
    ).toBe(true);
    expect(
      shouldShowBeanOrderDetailShipmentSaveButton({
        trackingNumber: 'TH123',
        savedTrackingNumber: 'TH123',
      }),
    ).toBe(false);
    expect(
      shouldShowBeanOrderDetailShipmentSaveButton({
        trackingNumber: 'TH999',
        savedTrackingNumber: 'TH123',
      }),
    ).toBe(true);
  });

  test('isBeanOrderDetailTrackingDirty trims before compare', () => {
    expect(isBeanOrderDetailTrackingDirty('  K1 ', 'K1')).toBe(false);
    expect(isBeanOrderDetailTrackingDirty('K2', 'K1')).toBe(true);
  });

  test('label is always อัปเดตการจัดส่ง', () => {
    expect(getBeanOrderDetailShipmentSaveButtonLabel('pending')).toBe('อัปเดตการจัดส่ง');
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
    const autoSaveStart = source.indexOf('async function autoSaveCarrierChannel');
    const autoSaveEnd = source.indexOf('\n  function handleCarrierCodeChange', autoSaveStart);
    const autoSaveBody = source.slice(autoSaveStart, autoSaveEnd);
    expect(autoSaveBody).toMatch(/await saveBeanOrderShipmentPlan/);
    expect(autoSaveBody).not.toContain('persistShipmentFromForm');
    expect(source).toContain('shouldShowBeanOrderDetailShipmentSaveButton');
    expect(source).toContain('shouldShowDeliveredButton');
    expect(source).toContain('confirmBeanOrderDelivered');
  });
});