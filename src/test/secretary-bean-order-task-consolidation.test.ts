import { describe, expect, test } from 'vitest';
import {
  formatBeanOrdersBoardTaskTitle,
  isLegacyBeanOrderTaskType,
} from '@/lib/secretary/bean-order-task-consolidation';

describe('bean order task consolidation', () => {
  test('uses unified board title', () => {
    expect(formatBeanOrdersBoardTaskTitle(3)).toBe('ออเดอร์เมล็ดกาแฟ (3)');
  });

  test('detects legacy split task types', () => {
    expect(isLegacyBeanOrderTaskType('bean_payment_pending')).toBe(true);
    expect(isLegacyBeanOrderTaskType('bean_orders_pending')).toBe(false);
  });
});
