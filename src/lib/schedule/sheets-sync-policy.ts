import { format } from 'date-fns';

/**
 * Google Sheet schedule sync policy:
 * - Manual only — triggered by the Schedule toolbar button, never on save/realtime.
 * - Single week — only the week visible in the UI (Mon–Sun from the date picker).
 * - Never syncs the full month or multiple week blocks in one action.
 */
export const SCHEDULE_SHEETS_SYNC_POLICY = {
  manualOnly: true,
  singleWeekOnly: true,
} as const;

export function formatScheduleWeekRangeLabel(weekStartMonday: string, weekEndSunday: string): string {
  return `${format(new Date(weekStartMonday), 'dd/MM/yyyy')} – ${format(new Date(weekEndSunday), 'dd/MM/yyyy')}`;
}
