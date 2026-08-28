import type { InventoryNotification } from '@/lib/notification-types';

export function isEligibleSecretaryNotification(
  notification: InventoryNotification,
): boolean {
  return notification.metadata?.kind === 'secretary_digest';
}

export function isEligibleSecretaryLogRow(row: {
  metadata?: Record<string, unknown> | null;
}): boolean {
  return row.metadata?.kind === 'secretary_digest';
}
