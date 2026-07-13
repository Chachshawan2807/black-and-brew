'use server';

import {
  compileDailyReportData,
  type DailyReportSchedule,
} from '@/app/actions/daily-report-actions';
import { recordDailyReportNotificationLog } from '@/lib/daily-report-notification';
import { ensureServerSession } from '@/lib/security/server-auth';

const BACKFILL_SCHEDULES: DailyReportSchedule[] = ['today', 'tomorrow'];

/** Ensure current daily schedule reports exist in data_change_logs for in-app history. */
export async function ensureDailyReportNotificationHistory(): Promise<{ success: boolean }> {
  const auth = await ensureServerSession();
  if (!auth.ok) {
    return { success: false };
  }

  try {
    for (const schedule of BACKFILL_SCHEDULES) {
      const report = await compileDailyReportData(schedule);
      await recordDailyReportNotificationLog(report, 'th');
    }
    return { success: true };
  } catch (error) {
    console.error('[ensureDailyReportNotificationHistory] Exception:', error);
    return { success: false };
  }
}
