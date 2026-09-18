import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  buildDailyReportFieldSummary,
  buildDailyReportSummaryLine,
  parseDailyReportSnapshot,
} from '@/lib/daily-report-summary';
import type { InventoryNotification } from '@/lib/notification-types';

export function isEligibleDailyReportNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'schedule' || row.status !== 'success') return false;
  if (row.entity_type !== 'daily_report') return false;
  const meta = row.metadata ?? {};
  return meta.kind === 'daily_report';
}

export function formatDailyReportNotification(
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
        ? 'ตารางงาน'
        : 'Schedule';

  const snapshot = parseDailyReportSnapshot(row.new_value);
  const fieldSummaryFromSnapshot = snapshot ? buildDailyReportFieldSummary(snapshot) : '';
  const summaryFromSnapshot = snapshot ? buildDailyReportSummaryLine(snapshot) : '';

  const fieldSummary =
    fieldSummaryFromSnapshot ||
    (typeof meta.fieldSummary === 'string'
      ? meta.fieldSummary
      : typeof meta.summary === 'string'
        ? meta.summary
        : '');
  const summary =
    summaryFromSnapshot ||
    (typeof meta.summary === 'string'
      ? meta.summary
      : fieldSummary.split('\n').filter(Boolean)[0] ?? '');

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
    priority: 'normal',
    read: false,
    batchedCount: 1,
    metadata: {
      ...meta,
      kind: 'daily_report',
      module: 'schedule',
    },
  };
}
