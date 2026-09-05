import type { LeaveDetailEntry } from '@/lib/dashboard/leave-details';

import { DASHBOARD_STAT_COLORS } from '@/lib/shift-colors';

const ROW_STYLES = {
  leave: DASHBOARD_STAT_COLORS.leave,
  holiday: DASHBOARD_STAT_COLORS.holiday,
} as const;

type Props = {
  entries: LeaveDetailEntry[];
  variant: 'leave' | 'holiday';
  className?: string;
};

export function DashboardStatDetailRows({ entries, variant, className = '' }: Props) {
  if (entries.length === 0) return null;

  return (
    <ul className={`space-y-2 ${className}`.trim()}>
      {entries.map((entry) => (
        <li
          key={entry.date}
          className={`rounded-2xl px-4 py-3 ${ROW_STYLES[variant]}`}
        >
          <p className="text-sm font-normal leading-snug text-[#000000]">
            <span>{entry.dateLabel}</span>
            <span className="text-[#000000]/80"> · {entry.dayLabel}</span>
            {entry.remark ? (
              <>
                <span className="text-[#000000]/80"> · </span>
                <span>{entry.remark}</span>
              </>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
