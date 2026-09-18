/** Which calendar day the daily schedule notification should cover. */
export type DailyReportSchedule = 'today' | 'tomorrow';

export interface StaffShiftEntry {
  name: string;
  shiftText: string;
  remark?: string;
}

export interface DailyReportData {
  schedule: DailyReportSchedule;
  dateStr: string;
  /** Timed front-store shifts only (6:30, 7:00, 8:00, …) counted in headcount */
  activeStaff: StaffShiftEntry[];
  /** Non-timed duties (ร้านซักผ้า, ไปสาขา 2) shown under เข้างาน, not counted */
  otherDutyStaff: StaffShiftEntry[];
  offStaff: StaffShiftEntry[];
  headcount: number;
  holiday: { name: string; daysRemaining: number } | null;
}
