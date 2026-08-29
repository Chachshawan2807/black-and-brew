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

      {leaveEntries.length > 0 ? (
        <section className="w-full max-w-md">
          <h4 className="mb-2 text-sm font-normal text-foreground">รายละเอียดวันลา</h4>
          <DashboardStatDetailRows entries={leaveEntries} variant="leave" />
        </section>
      ) : null}

      {holidayWorkEntries.length > 0 ? (
        <section className="w-full max-w-md">
          <h4 className="mb-2 text-sm font-normal text-foreground">
            รายละเอียดวันทำงานตรงวันนักขัตฯ
          </h4>
          <DashboardStatDetailRows entries={holidayWorkEntries} variant="holiday" />
        </section>
      ) : null}

      {!hasDetailSections ? <span className="sr-only">ไม่มีรายละเอียดวันลาหรือวันทำงานตรงวันนักขัตฯ</span> : null}
    </div>
  );
}
