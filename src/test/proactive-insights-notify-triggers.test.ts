import { describe, expect, test } from 'vitest';
import type { Insight } from '@/lib/proactive-insights/types';
import {
  shouldDispatchInsightNotification,
  shouldForceInsightDigestRefresh,
} from '@/lib/proactive-insights/insight-dispatch-triggers';

const highRule: Insight = {
  ruleId: 'understaffed_low_stock',
  title: 'คนน้อย',
  summary: 'จ. 20 3 คน',
  urlPath: '/schedule',
  priority: 'high',
  modules: ['schedule'],
};

const beanRule: Insight = {
  ruleId: 'bean_orders_inventory_gap',
  title: 'ออเดอร์เมล็ดค้าง',
  summary: 'ค้างจัดส่ง 1 รายการ',
  urlPath: '/bean-orders',
  priority: 'normal',
  modules: ['bean_orders'],
};

describe('insight dispatch triggers', () => {
  test('shift_update dispatches only for high-priority matched rules', () => {
    expect(shouldDispatchInsightNotification('shift_update', [highRule])).toBe(true);
    expect(shouldDispatchInsightNotification('shift_update', [beanRule])).toBe(false);
    expect(shouldDispatchInsightNotification('manual', [highRule])).toBe(false);
  });

  test('bean_order_update dispatches only for pending bean rule', () => {
    expect(shouldDispatchInsightNotification('bean_order_update', [beanRule])).toBe(true);
    expect(shouldDispatchInsightNotification('bean_order_update', [highRule])).toBe(false);
  });

  test('mutation triggers force refresh only when digest summary changed', () => {
    expect(
      shouldForceInsightDigestRefresh('shift_update', 'คนน้อย: เดิม', 'คนน้อย: ใหม่'),
    ).toBe(true);
    expect(
      shouldForceInsightDigestRefresh('shift_update', 'คนน้อย: เดิม', 'คนน้อย: เดิม'),
    ).toBe(false);
    expect(shouldForceInsightDigestRefresh('cron', 'เดิม', 'ใหม่')).toBe(false);
    expect(shouldForceInsightDigestRefresh('bean_order_update', null, 'ใหม่')).toBe(false);
  });
});
