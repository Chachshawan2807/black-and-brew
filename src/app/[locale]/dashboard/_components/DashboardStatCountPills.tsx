import { DASHBOARD_STAT_COLORS } from '@/lib/shift-colors';
import type { DashboardStaffStatCounts } from '@/lib/dashboard/leave-details';

type Props = DashboardStaffStatCounts & {
  className?: string;
};

export function DashboardStatCountPills({
  workDays,
  leaveDays,
  publicHolidays,
  className = '',
}: Props) {
  return (
    <div className={`bb-roster-export-stat-counts grid grid-cols-3 gap-3 ${className}`.trim()}>
      <div
        className={`${DASHBOARD_STAT_COLORS.work} bb-pastel-surface flex flex-col items-center justify-center rounded-3xl p-3 text-center`}
      >
        <span className="text-[22px] font-normal text-[#000000]">{workDays}</span>
        <span className="mt-0.5 text-[12px] font-normal uppercase tracking-widest text-[#000000]">
          ทำงาน
        </span>
      </div>
      <div
        className={`${DASHBOARD_STAT_COLORS.holiday} bb-pastel-surface flex flex-col items-center justify-center rounded-3xl p-3 text-center`}
      >
        <span className="text-[22px] font-normal text-[#000000]">{publicHolidays}</span>
        <span className="mt-0.5 text-[12px] font-normal uppercase tracking-widest text-[#000000]">
          นักขัตฯ
        </span>
      </div>
      <div
        className={`${DASHBOARD_STAT_COLORS.leave} bb-pastel-surface flex flex-col items-center justify-center rounded-3xl p-3 text-center`}
      >
        <span className="text-[22px] font-normal text-[#000000]">{leaveDays}</span>
        <span className="mt-0.5 text-[12px] font-normal uppercase tracking-widest text-[#000000]">
          ลา
        </span>
      </div>
    </div>
  );
}
