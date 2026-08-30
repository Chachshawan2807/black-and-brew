import { describe, expect, test } from 'vitest';
import type { Insight } from '@/lib/proactive-insights/types';
import {
  isRealtimeInsightTrigger,
  shouldDispatchInsightNotification,
  shouldForceInsightDigestRefresh,
} from '@/lib/proactive-insights/insight-dispatch-triggers';

const highRule: Insight = {
  ruleId: 'understaffed_low_stock',
  title: 'คนน้อย',
  summary: 'จ. ที่ 20 (3 คน)',
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
  test('realtime mutation triggers include shift, inventory, and bean order updates', () => {
    expect(isRealtimeInsightTrigger('shift_update')).toBe(true);
    expect(isRealtimeInsightTrigger('inventory_update')).toBe(true);
    expect(isRealtimeInsightTrigger('bean_order_update')).toBe(true);
    expect(isRealtimeInsightTrigger('cron')).toBe(false);
    expect(isRealtimeInsightTrigger('manual')).toBe(false);
  });

  test('mutation triggers never dispatch cron only', () => {
    expect(shouldDispatchInsightNotification('shift_update', [highRule])).toBe(false);
    expect(shouldDispatchInsightNotification('shift_update', [beanRule])).toBe(false);
    expect(shouldDispatchInsightNotification('inventory_update', [beanRule])).toBe(false);
    expect(shouldDispatchInsightNotification('bean_order_update', [highRule])).toBe(false);
    expect(shouldDispatchInsightNotification('cron', [highRule])).toBe(true);
    expect(shouldDispatchInsightNotification('manual', [highRule])).toBe(false);
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
