import {
  collectWeeklyLeaveEntries,
  filterFutureUnderstaffedDays,
  filterUpcomingLeaveEntries,
} from '@/lib/proactive-insights/week-schedule';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';
import {
  formatUnderstaffedDaySummary,
  formatLeaveCoverageSummary,
} from '@/lib/proactive-insights/format-short-day';
import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';

export function deriveScheduleTasks(snapshot: SecretarySnapshot): DerivedTaskDraft[] {
  const tasks: DerivedTaskDraft[] = [];
  const localePrefix = `/${snapshot.locale}`;

  const upcomingHolidaySoon =
    snapshot.operational.upcomingHoliday &&
    snapshot.operational.upcomingHoliday.daysRemaining <= 3;

  const understaffed = filterFutureUnderstaffedDays(
    snapshot.operational.weeklyDays,
    snapshot.dateIso,
  );
  if (understaffed.length > 0) {
    const daySummary = understaffed
      .map((day) => formatUnderstaffedDaySummary(day.dateIso, day.dayIndex, day.headcount))
      .join(', ');
    const summary = upcomingHolidaySoon
      ? `${daySummary} · ใกล้วันหยุด ${snapshot.operational.upcomingHoliday?.name}`
      : daySummary;
    const sourceRef = {
      rule: 'understaffed',
      dates: understaffed.map((d) => d.dateIso),
      understaffedDays: understaffed.map((day) => ({
        dateIso: day.dateIso,
        dayIndex: day.dayIndex,
        headcount: day.headcount,
      })),
    };
    tasks.push({
      taskType: 'schedule_understaffed',
      title: 'ตารางงาน วันที่คนน้อย',
      description: summary,
      priority: 'urgent',
      module: 'schedule',
      sourceRef,
      sourceRefHash: buildSourceRefHash('schedule_understaffed', sourceRef),
      actionHref: `${localePrefix}/schedule`,
      estimatedMinutes: 20,
    });
  }

  const leaveEntries = filterUpcomingLeaveEntries(
    collectWeeklyLeaveEntries(snapshot.operational.weeklyDays),
    snapshot.dateIso,
  );
  if (leaveEntries.length >= INSIGHT_THRESHOLDS.leaveCoverageMinLeave) {
    const summary = formatLeaveCoverageSummary(leaveEntries);
    const sourceRef = {
      rule: 'leave_risk',
      count: leaveEntries.length,
      dates: [...new Set(leaveEntries.map((entry) => entry.dateIso))],
      leaveEntries: leaveEntries.map((entry) => ({
        dateIso: entry.dateIso,
        dayIndex: entry.dayIndex,
        name: entry.name,
      })),
    };
    tasks.push({
      taskType: 'schedule_leave_risk',
      title: 'ตารางงาน ลาหลายคน',
      description: summary,
      priority: 'urgent',
      module: 'schedule',
      sourceRef,
      sourceRefHash: buildSourceRefHash('schedule_leave_risk', sourceRef),
      actionHref: `${localePrefix}/schedule`,
      estimatedMinutes: 20,
    });
  }

  return tasks;
}
