import {
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { th } from 'date-fns/locale';

/** Primary heading for individual roster PNG export (Thai month names). */
export function formatRosterExportPeriodLabel(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (isSameDay(start, end)) {
    return format(start, 'd MMMM yyyy', { locale: th });
  }

  if (isSameMonth(start, end)) {
    const monthStart = startOfMonth(start);
    const monthEnd = endOfMonth(start);
    if (isSameDay(start, monthStart) && isSameDay(end, monthEnd)) {
      return format(start, 'MMMM yyyy', { locale: th });
    }

    return `${format(start, 'd', { locale: th })}-${format(end, 'd MMMM yyyy', { locale: th })}`;
  }

  return `${format(start, 'd MMM yyyy', { locale: th })} - ${format(end, 'd MMM yyyy', { locale: th })}`;
}
