import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { formatHistoryDateTime } from '@/lib/bean-orders/history-display';

/** Meta line for settings edit history: datetime first, then actor. */
export function formatDataChangeHistoryMeta(
  row: Pick<DataChangeLogRow, 'actor_label' | 'occurred_at'>,
  locale: string,
): string {
  const when = formatHistoryDateTime(row.occurred_at, locale);
  const actor = row.actor_label?.trim();
  return actor ? `${when} · ${actor}` : when;
}
