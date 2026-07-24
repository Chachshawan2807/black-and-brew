import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { InventoryNotification } from '@/lib/notification-types';

export const SECURITY_MODULE = 'security';
export const PIN_LOCKOUT_KIND = 'pin_lockout' as const;

export function isEligibleSecurityNotification(row: DataChangeLogRow): boolean {
  if (row.module !== SECURITY_MODULE || row.status !== 'success') return false;
  return row.metadata?.kind === PIN_LOCKOUT_KIND;
}

export function formatSecurityNotification(
  row: DataChangeLogRow,
  locale: string,
): InventoryNotification {
  const meta = row.metadata ?? {};
  const isTh = locale === 'th';
  const logId =
    typeof meta.notificationLogId === 'string'
      ? meta.notificationLogId
      : row.entity_id ?? row.id;
  const title =
    typeof meta.title === 'string'
      ? meta.title
      : isTh
        ? 'แจ้งเตือนความปลอดภัย'
        : 'Security alert';
  const fieldSummary =
    typeof meta.fieldSummary === 'string'
      ? meta.fieldSummary
      : typeof meta.summary === 'string'
        ? meta.summary
        : '';
  const summary =
    typeof meta.summary === 'string'
      ? meta.summary
      : fieldSummary.split('\n').filter(Boolean)[0] ?? '';

  return {
    id: logId,
    logId,
    action: 'UPDATE',
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    actorLabel: row.actor_label,
    occurredAt: row.occurred_at,
    title,
    summary,
    fieldSummary,
    priority: 'high',
    read: false,
    batchedCount: 1,
    metadata: {
      ...meta,
      module: SECURITY_MODULE,
    },
  };
}
