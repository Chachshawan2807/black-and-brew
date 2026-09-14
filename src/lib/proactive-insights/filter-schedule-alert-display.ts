import {
  formatLeaveCoverageSummary,
  formatUnderstaffedDaySummary,
} from '@/lib/proactive-insights/format-short-day';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';
import type { Insight } from '@/lib/proactive-insights/types';
import { buildDailyInsightDigest } from '@/lib/proactive-insights/rules';

export const SCHEDULE_INSIGHT_RULE_IDS = new Set<string>([
  'understaffed_low_stock',
  'leave_coverage_risk',
]);

export type ScheduleUnderstaffedDayRef = {
  dateIso: string;
  dayIndex: number;
  headcount: number;
};

export type ScheduleLeaveEntryRef = {
  dateIso: string;
  dayIndex: number;
  name: string;
};

/** Calendar dates strictly after todayIso (today and past are excluded). */
export function isStrictlyFutureScheduleDate(dateIso: string, todayIso: string): boolean {
  return dateIso > todayIso;
}

export function filterInsightForScheduleDisplay(
  insight: Insight,
  todayIso: string,
): Insight | null {
  if (insight.ruleId === 'understaffed_low_stock') {
    if (!insight.scheduleUnderstaffedDays) return insight;
    const days = insight.scheduleUnderstaffedDays.filter((day) =>
      isStrictlyFutureScheduleDate(day.dateIso, todayIso),
    );
    if (days.length === 0) return null;
    return {
      ...insight,
      summary: days
        .map((day) => formatUnderstaffedDaySummary(day.dateIso, day.dayIndex, day.headcount))
        .join(', '),
      scheduleUnderstaffedDays: days,
    };
  }

  if (insight.ruleId === 'leave_coverage_risk') {
    if (!insight.scheduleLeaveEntries) return insight;
    const entries = insight.scheduleLeaveEntries.filter((entry) =>
      isStrictlyFutureScheduleDate(entry.dateIso, todayIso),
    );
    if (entries.length < INSIGHT_THRESHOLDS.leaveCoverageMinLeave) return null;
    return {
      ...insight,
      summary: formatLeaveCoverageSummary(entries),
      scheduleLeaveEntries: entries,
    };
  }

  return insight;
}

export function filterMatchedInsightsForDisplay(
  insights: Insight[],
  todayIso: string,
): Insight[] {
  const filtered: Insight[] = [];
  for (const insight of insights) {
    const next = filterInsightForScheduleDisplay(insight, todayIso);
    if (next) filtered.push(next);
  }
  return filtered;
}

export function rebuildInsightDigestDisplayCopy(
  matchedRules: Insight[],
  todayIso: string,
): { fieldSummary: string; summary: string; hasContent: boolean } {
  const filtered = filterMatchedInsightsForDisplay(matchedRules, todayIso);
  const digest = buildDailyInsightDigest(filtered);
  if (!digest) {
    return { fieldSummary: '', summary: '', hasContent: false };
  }

  const lines = digest.summary.split('\n').filter(Boolean);
  return {
    fieldSummary: digest.summary,
    summary: lines[0] ?? digest.summary,
    hasContent: true,
  };
}

export function parseMatchedRuleSnapshotsFromMetadata(
  metadata: Record<string, unknown>,
): Insight[] | null {
  const raw = metadata.matchedRuleSnapshots;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const snapshots: Insight[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.ruleId !== 'string' || typeof row.title !== 'string') continue;
    if (typeof row.summary !== 'string') continue;
    if (typeof row.urlPath !== 'string') continue;
    if (!Array.isArray(row.modules)) continue;

    snapshots.push({
      ruleId: row.ruleId as Insight['ruleId'],
      title: row.title,
      summary: row.summary,
      urlPath: row.urlPath,
      priority: row.priority === 'high' ? 'high' : 'normal',
      modules: row.modules.map(String),
      scheduleUnderstaffedDays: parseUnderstaffedDayRefs(row.scheduleUnderstaffedDays),
      scheduleLeaveEntries: parseLeaveEntryRefs(row.scheduleLeaveEntries),
    });
  }

  return snapshots.length > 0 ? snapshots : null;
}

function parseUnderstaffedDayRefs(raw: unknown): ScheduleUnderstaffedDayRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const days: ScheduleUnderstaffedDayRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.dateIso !== 'string') continue;
    if (typeof row.dayIndex !== 'number') continue;
    if (typeof row.headcount !== 'number') continue;
    days.push({
      dateIso: row.dateIso,
      dayIndex: row.dayIndex,
      headcount: row.headcount,
    });
  }
  return days.length > 0 ? days : undefined;
}

function parseLeaveEntryRefs(raw: unknown): ScheduleLeaveEntryRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const entries: ScheduleLeaveEntryRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.dateIso !== 'string') continue;
    if (typeof row.dayIndex !== 'number') continue;
    if (typeof row.name !== 'string') continue;
    entries.push({
      dateIso: row.dateIso,
      dayIndex: row.dayIndex,
      name: row.name,
    });
  }
  return entries.length > 0 ? entries : undefined;
}

export function serializeMatchedRuleSnapshots(matchedRules: Insight[]): Record<string, unknown>[] {
  return matchedRules.map((insight) => ({
    ruleId: insight.ruleId,
    title: insight.title,
    summary: insight.summary,
    urlPath: insight.urlPath,
    priority: insight.priority,
    modules: insight.modules,
    scheduleUnderstaffedDays: insight.scheduleUnderstaffedDays ?? null,
    scheduleLeaveEntries: insight.scheduleLeaveEntries ?? null,
  }));
}

export function filterScheduleTaskDescription(
  taskType: string,
  description: string | null | undefined,
  sourceRef: Record<string, unknown> | null | undefined,
  todayIso: string,
): string | null {
  const trimmed = description?.trim();
  if (!trimmed) return null;

  if (taskType === 'schedule_understaffed') {
    const days = parseUnderstaffedDayRefs(sourceRef?.understaffedDays);
    if (!days) return trimmed;
    const future = days.filter((day) => isStrictlyFutureScheduleDate(day.dateIso, todayIso));
    if (future.length === 0) return null;
    return future
      .map((day) => formatUnderstaffedDaySummary(day.dateIso, day.dayIndex, day.headcount))
      .join(', ');
  }

  if (taskType === 'schedule_leave_risk') {
    const entries = parseLeaveEntryRefs(sourceRef?.leaveEntries);
    if (!entries) return trimmed;
    const future = entries.filter((entry) => isStrictlyFutureScheduleDate(entry.dateIso, todayIso));
    if (future.length < INSIGHT_THRESHOLDS.leaveCoverageMinLeave) return null;
    return formatLeaveCoverageSummary(future);
  }

  return trimmed;
}
