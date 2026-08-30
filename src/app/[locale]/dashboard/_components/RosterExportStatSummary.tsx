import { DashboardStatCountPills } from './DashboardStatCountPills';
import { DashboardStatDetailRows } from './DashboardStatDetailRows';
import type { DashboardStaffStatCounts, LeaveDetailEntry } from '@/lib/dashboard/leave-details';

type Props = DashboardStaffStatCounts & {
  leaveEntries: LeaveDetailEntry[];
  holidayWorkEntries: LeaveDetailEntry[];
};

export function RosterExportStatSummary({
  workDays,
  leaveDays,
  publicHolidays,
  leaveEntries,
  holidayWorkEntries,
}: Props) {
  const hasDetailSections = leaveEntries.length > 0 || holidayWorkEntries.length > 0;

  return (
    <div className="bb-roster-export-summary mt-6 flex w-full max-w-[776px] flex-col items-start gap-4">
      <DashboardStatCountPills
        workDays={workDays}
        leaveDays={leaveDays}
        publicHolidays={publicHolidays}
        className="w-full max-w-md"
      />

      {hasDetailSections ? (
        <div className="bb-roster-export-stat-details flex w-full flex-col gap-4 md:flex-row md:items-start md:gap-6">
          {leaveEntries.length > 0 ? (
            <section className="w-full md:min-w-0 md:max-w-[calc(50%-12px)]">
              <h4 className="mb-2 text-sm font-normal text-foreground">วันลา</h4>
              <DashboardStatDetailRows entries={leaveEntries} variant="leave" />
            </section>
          ) : null}

          {holidayWorkEntries.length > 0 ? (
            <section
              className={`w-full md:min-w-0 md:max-w-[calc(50%-12px)] ${leaveEntries.length === 0 ? 'md:ml-auto' : ''}`}
              data-export-align={leaveEntries.length === 0 ? 'right' : undefined}
            >
              <h4 className="mb-2 text-sm font-normal text-foreground">
                วันทำงานที่ตรงวันนักขัตฯ
              </h4>
              <DashboardStatDetailRows entries={holidayWorkEntries} variant="holiday" />
            </section>
          ) : null}
        </div>
      ) : (
        <span className="sr-only">ไม่มีวันลาหรือวันทำงานที่ตรงวันนักขัตฯ</span>
      )}
    </div>
  );
}
