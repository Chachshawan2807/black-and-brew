import type { SecretaryTask } from '@/lib/secretary/types';

export type SecretaryTaskOverlayKind =
  | 'purchase_orders'
  | 'branch_withdraw_panel'
  | 'bean_orders_panel'
  | 'maintenance_list'
  | 'schedule_panel'
  | 'task_info';

export function resolveSecretaryTaskOverlayKind(
  task: SecretaryTask,
): SecretaryTaskOverlayKind | null {
  if (task.source_kind === 'ai_suggested') return null;

  switch (task.task_type) {
    case 'inventory_reorder':
      return 'purchase_orders';
    case 'branch_withdraw':
      return 'branch_withdraw_panel';
    case 'bean_orders_pending':
    case 'bean_payment_pending':
    case 'bean_ship_pending':
    case 'bean_tracking_check':
      return 'bean_orders_panel';
    case 'maintenance_due':
    case 'maintenance_overdue':
      return 'maintenance_list';
    case 'schedule_understaffed':
    case 'schedule_leave_risk':
    case 'schedule_mgmt_review':
      return 'schedule_panel';
    default:
      return 'task_info';
  }
}
