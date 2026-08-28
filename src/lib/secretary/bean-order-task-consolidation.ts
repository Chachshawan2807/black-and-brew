import type { SecretaryTaskType } from '@/lib/secretary/types';

export const BEAN_ORDERS_UNIFIED_TASK_TYPE = 'bean_orders_pending' as const;

export const LEGACY_BEAN_ORDER_TASK_TYPES = [
  'bean_payment_pending',
  'bean_ship_pending',
  'bean_tracking_check',
] as const satisfies readonly SecretaryTaskType[];

export function formatBeanOrdersBoardTaskTitle(count: number): string {
  return `ออเดอร์เมล็ดกาแฟ (${count})`;
}

export function isLegacyBeanOrderTaskType(taskType: string): boolean {
  return (LEGACY_BEAN_ORDER_TASK_TYPES as readonly string[]).includes(taskType);
}

export function isBeanOrdersUnifiedTaskType(taskType: string): boolean {
  return taskType === BEAN_ORDERS_UNIFIED_TASK_TYPE;
}
