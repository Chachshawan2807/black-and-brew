import { Calendar as CalendarIcon } from '@/lib/icons';
import { formatRosterExportPeriodLabel } from '@/lib/roster/export-period-label';

type Props = {
  startDate: string;
  endDate: string;
};

export function RosterExportPeriodHeader({ startDate, endDate }: Props) {
  const periodLabel = formatRosterExportPeriodLabel(startDate, endDate);

  return (
    <div className="bb-roster-export-period mb-6 flex w-full max-w-[776px] items-center gap-4 rounded-2xl border border-border bg-muted/40 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-foreground/85 bg-card text-foreground">
        <CalendarIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
          ช่วงวันที่
        </p>
        <p className="bb-roster-export-period-label text-xl font-normal tracking-tight text-foreground md:text-2xl">
          {periodLabel}
        </p>
      </div>
    </div>
  );
}
