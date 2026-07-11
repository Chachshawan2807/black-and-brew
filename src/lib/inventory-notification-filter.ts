import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';

/** Allowed UI origins for desktop/mobile inventory stock notifications. */
export const INVENTORY_NOTIFICATION_SOURCES = {
  QUICK_ACTION_BAR: 'inventory_quick_action_bar',
  QUICK_ACTION_FAB: 'inventory_quick_action_fab',
  WAREHOUSE_GRID: 'inventory_warehouse_grid',
  BRANCH_WITHDRAW: 'inventory_branch_withdraw',
} as const;

export type InventoryNotificationSource =
  (typeof INVENTORY_NOTIFICATION_SOURCES)[keyof typeof INVENTORY_NOTIFICATION_SOURCES];

const ALLOWED_SOURCES = new Set<string>(Object.values(INVENTORY_NOTIFICATION_SOURCES));

/** Explicit server-side opt-out (rare). */
export function isSuppressedInventoryNotification(
  metadata?: Record<string, unknown>
): boolean {
  if (!metadata) return true;
  if (metadata.suppressNotification === true) return true;
  if (metadata.notificationContext === 'inventory_count') return true;
  return false;
}

export function isAllowedInventoryNotificationSource(
  metadata?: Record<string, unknown>
): metadata is Record<string, unknown> & { notificationSource: InventoryNotificationSource } {
  if (!metadata) return false;
  const source = metadata.notificationSource;
  return typeof source === 'string' && ALLOWED_SOURCES.has(source);
}

/** Only In / Out / Adjust stock movements may trigger notifications. */
export function isNotifyableStockOperation(metadata?: Record<string, unknown>): boolean {
  if (!metadata) return false;
  const operation = metadata.operation;
  if (operation === 'record_transaction') {
    const type = metadata.type;
    return type === 'IN' || type === 'OUT';
  }
  if (operation === 'set_stock') return true;
  return false;
}

/** Strict source-based gate for desktop & mobile inventory notifications. */
export function isEligibleInventoryNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'inventory' || row.status !== 'success') return false;
  if (isSuppressedInventoryNotification(row.metadata)) return false;
  if (!isAllowedInventoryNotificationSource(row.metadata)) return false;
  if (!isNotifyableStockOperation(row.metadata)) return false;
  return true;
}
