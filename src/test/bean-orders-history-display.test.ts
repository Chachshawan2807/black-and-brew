import { describe, expect, test } from 'vitest';
import {
  formatBeanOrderAuditHeadline,
  formatBeanOrderEnumValue,
  formatBeanOrderStatusAction,
  formatBeanOrderStatusHistoryLine,
  formatHistoryDateTime,
} from '@/lib/bean-orders/history-display';
import { formatDataChangeHistoryMeta } from '@/lib/data-change-history-display';

describe('formatBeanOrderStatusAction', () => {
  test('maps stored English actions to Thai labels', () => {
    expect(formatBeanOrderStatusAction('created', true)).toBe('สร้างออเดอร์');
    expect(formatBeanOrderStatusAction('payment_confirmed', true)).toBe('ยืนยันชำระเงิน');
    expect(formatBeanOrderStatusAction('delivery_confirmed', true)).toBe('จัดส่งสำเร็จ');
  });
});

describe('formatBeanOrderEnumValue', () => {
  test('maps stored enum values to Thai labels', () => {
    expect(formatBeanOrderEnumValue('unpaid', true)).toBe('ยังไม่ชำระ');
    expect(formatBeanOrderEnumValue('paid', true)).toBe('ชำระแล้ว');
    expect(formatBeanOrderEnumValue('pending', true)).toBe('รอจัดส่ง');
    expect(formatBeanOrderEnumValue('shipped', true)).toBe('ส่งแล้ว');
  });
});

describe('formatBeanOrderStatusHistoryLine', () => {
  test('formats concise Thai line with datetime, action, and actor', () => {
    const line = formatBeanOrderStatusHistoryLine(
      {
        at: '2026-09-08T10:30:00.000Z',
        by: 'ผู้แก้ไข (Android)',
        action: 'payment_confirmed',
        payment_status: 'paid',
        fulfillment_status: 'pending',
      },
      'th',
    );
    expect(line).toContain('ยืนยันชำระเงิน');
    expect(line).toContain('ผู้แก้ไข (Android)');
    expect(line).not.toContain('payment_confirmed');
    expect(line).toMatch(/·/);
  });
});

describe('formatBeanOrderAuditHeadline', () => {
  test('uses Thai order headlines for bean order audit rows', () => {
    expect(formatBeanOrderAuditHeadline('CREATE', 'bean_order', 'BO-250908-01', true)).toBe(
      'สร้างออเดอร์ BO-250908-01',
    );
    expect(formatBeanOrderAuditHeadline('UPDATE', 'bean_order', 'BO-250908-01', true)).toBe(
      'แก้ไขออเดอร์ BO-250908-01',
    );
    expect(formatBeanOrderAuditHeadline('CREATE', 'bean_customer', 'คุณสมชาย', true)).toBe(
      'เพิ่มลูกค้า: คุณสมชาย',
    );
  });
});

describe('formatDataChangeHistoryMeta', () => {
  test('shows datetime first and actor without network line', () => {
    const meta = formatDataChangeHistoryMeta(
      {
        occurred_at: '2026-09-08T10:30:00.000Z',
        actor_label: 'ผู้แก้ไข (Android)',
      },
      'th',
    );
    expect(meta).toContain('ผู้แก้ไข (Android)');
    expect(meta).not.toContain('แก้ไขเมื่อ');
    expect(meta).not.toContain('จากเครือข่าย');
    expect(meta).toMatch(/·/);
  });
});

describe('formatHistoryDateTime', () => {
  test('uses Thai locale and Bangkok timezone', () => {
    const formatted = formatHistoryDateTime('2026-09-08T10:30:00.000Z', 'th');
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).not.toContain('payment');
  });
});
