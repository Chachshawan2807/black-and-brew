import type { SecretaryTask } from '@/lib/secretary/types';

export type SecretaryTaskOverlayKind =
  | 'purchase_orders'
  | 'branch_withdraw_panel'
  | 'bean_orders_list'
  | 'maintenance_list'
  | 'task_info';

export function resolveSecretaryTaskOverlayKind(task: SecretaryTask): SecretaryTaskOverlayKind {
  switch (task.task_type) {
    case 'inventory_reorder':
      return 'purchase_orders';
    case 'branch_withdraw':
      return 'branch_withdraw_panel';
    case 'bean_orders_pending':
    case 'bean_payment_pending':
    case 'bean_ship_pending':
    case 'bean_tracking_check':
      return 'bean_orders_list';
    case 'maintenance_due':
    case 'maintenance_overdue':
      return 'maintenance_list';
    default:
      return 'task_info';
  }
}
