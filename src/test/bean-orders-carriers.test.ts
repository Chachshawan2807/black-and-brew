import { describe, expect, test } from 'vitest';
import {
  BEAN_ORDER_CARRIERS,
  formatBeanOrderCarrierChangeMessage,
  getCarrierLabel,
  initialCarrierSelection,
  resolveCarrierCodeForSave,
} from '@/lib/bean-orders/carriers';

describe('BEAN_ORDER_CARRIERS', () => {
  test('includes Lalamove as a selectable channel', () => {
    expect(BEAN_ORDER_CARRIERS.some((c) => c.code === 'lalamove' && c.label === 'Lalamove')).toBe(true);
    expect(getCarrierLabel('lalamove')).toBe('Lalamove');
  });

  test('lists customer pickup directly above other', () => {
    const pickupIdx = BEAN_ORDER_CARRIERS.findIndex((c) => c.code === 'customer-pickup');
    const otherIdx = BEAN_ORDER_CARRIERS.findIndex((c) => c.code === 'other');
    expect(pickupIdx).toBeGreaterThan(-1);
    expect(otherIdx).toBe(pickupIdx + 1);
    expect(getCarrierLabel('customer-pickup')).toBe('ลูกค้ามารับเอง');
  });
});

describe('carrier selection helpers', () => {
  test('maps legacy customer pickup labels to the pickup carrier option', () => {
    expect(initialCarrierSelection('ลูกค้ามารับด้วยตัวเอง')).toEqual({
      carrierCode: 'customer-pickup',
      customCarrierLabel: '',
    });
    expect(initialCarrierSelection('ลูกค้ามารับเอง')).toEqual({
      carrierCode: 'customer-pickup',
      customCarrierLabel: '',
    });
  });

  test('keeps known carrier codes unchanged', () => {
    expect(initialCarrierSelection('kerryexpress-th')).toEqual({
      carrierCode: 'kerryexpress-th',
      customCarrierLabel: '',
    });
    expect(initialCarrierSelection('lalamove')).toEqual({
      carrierCode: 'lalamove',
      customCarrierLabel: '',
    });
  });

  test('resolves other selection to trimmed custom label', () => {
    expect(resolveCarrierCodeForSave('other', ' รถส่งเอง ')).toBe('รถส่งเอง');
    expect(resolveCarrierCodeForSave('other', '   ')).toBeNull();
    expect(resolveCarrierCodeForSave('flashexpress', '')).toBe('flashexpress');
  });

  test('formats carrier change message for updates and first save', () => {
    expect(formatBeanOrderCarrierChangeMessage(null, 'kerryexpress-th')).toBe(
      'บันทึกช่องทางการจัดส่ง: Kerry',
    );
    expect(formatBeanOrderCarrierChangeMessage('kerryexpress-th', 'flashexpress')).toBe(
      'เปลี่ยนช่องทางการจัดส่งจาก Kerry เป็น Flash',
    );
    expect(formatBeanOrderCarrierChangeMessage('kerryexpress-th', 'kerryexpress-th')).toBe(
      'อัปเดตการจัดส่งแล้ว',
    );
  });
});
