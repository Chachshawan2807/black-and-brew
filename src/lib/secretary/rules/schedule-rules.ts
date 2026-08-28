import {
  collectWeeklyLeaveEntries,
  filterUpcomingLeaveEntries,
  findUnderstaffedDays,
} from '@/lib/proactive-insights/week-schedule';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';
import { formatShortDayDate } from '@/lib/proactive-insights/format-short-day';
import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';

export function deriveScheduleTasks(snapshot: SecretarySnapshot): DerivedTaskDraft[] {
  const tasks: DerivedTaskDraft[] = [];
  const localePrefix = `/${snapshot.locale}`;

  const understaffed = findUnderstaffedDays(snapshot.operational.weeklyDays);
  if (understaffed.length > 0) {
    const summary = understaffed
      .map((day) => `${formatShortDayDate(day.dateIso, day.dayIndex)} ${day.headcount} คน`)
      .join(', ');
    const sourceRef = { rule: 'understaffed', dates: understaffed.map((d) => d.dateIso) };
    tasks.push({
      taskType: 'schedule_understaffed',
      title: 'ตรวจตาราง — วันที่คนน้อย',
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
    const summary = leaveEntries
      .map((entry) => `${entry.name} (${formatShortDayDate(entry.dateIso, entry.dayIndex)})`)
      .join(', ');
    const sourceRef = { rule: 'leave_risk', count: leaveEntries.length };
    tasks.push({
      taskType: 'schedule_leave_risk',
      title: 'ตรวจตาราง — ลาหลายคน',
      description: summary,
      priority: 'urgent',
      module: 'schedule',
      sourceRef,
      sourceRefHash: buildSourceRefHash('schedule_leave_risk', sourceRef),
      actionHref: `${localePrefix}/schedule`,
      estimatedMinutes: 20,
    });
  }

  if (snapshot.headcountToday <= 1) {
    const sourceRef = { dateIso: snapshot.dateIso, headcount: snapshot.headcountToday };
    tasks.push({
      taskType: 'staffing_gap_today',
      title: 'ตรวจแดชบอร์ด — คนวันนี้น้อย',
      description: `มี ${snapshot.headcountToday} คนในกะวันนี้`,
      priority: 'normal',
      module: 'dashboard',
      sourceRef,
      sourceRefHash: buildSourceRefHash('staffing_gap_today', sourceRef),
      actionHref: `${localePrefix}/dashboard`,
      estimatedMinutes: 15,
    });
  }

  return tasks;
}
