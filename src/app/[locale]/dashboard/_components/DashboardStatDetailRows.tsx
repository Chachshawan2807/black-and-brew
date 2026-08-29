import type { LeaveDetailEntry } from '@/lib/dashboard/leave-details';

const ROW_STYLES = {
  leave: 'border-[#f5c6cb] bg-[#f8d7da]',
  holiday: 'border-[#ffeeba] bg-[#fff3cd]',
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
          className={`rounded-2xl border px-4 py-3 bb-pastel-surface ${ROW_STYLES[variant]}`}
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
