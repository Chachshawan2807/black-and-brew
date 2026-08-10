import type { Insight, OperationalSnapshot } from '@/lib/proactive-insights/types';
import { formatShortDayDate } from '@/lib/proactive-insights/format-short-day';
import { formatPendingBeanOrdersSummary, countBeanOrderPendingStatuses } from '@/lib/proactive-insights/format-pending-bean-orders';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';
import {
  collectWeeklyLeaveEntries,
  findUnderstaffedDays,
} from '@/lib/proactive-insights/week-schedule';

function ruleUnderstaffedWeekly(snapshot: OperationalSnapshot): Insight | null {
  const understaffed = findUnderstaffedDays(snapshot.weeklyDays);
  if (understaffed.length === 0) return null;

  const dayParts = understaffed
    .map(
      (day) =>
        `${formatShortDayDate(day.dateIso, day.dayIndex)} ${day.headcount} คน`,
    )
    .join(', ');

  return {
    ruleId: 'understaffed_low_stock',
    title: 'คนน้อย',
    summary: dayParts,
    urlPath: '/schedule',
    priority: 'high',
    modules: ['schedule'],
  };
}

function ruleLeaveCoverageRisk(snapshot: OperationalSnapshot): Insight | null {
  const leaveEntries = collectWeeklyLeaveEntries(snapshot.weeklyDays);
  if (leaveEntries.length < INSIGHT_THRESHOLDS.leaveCoverageMinLeave) return null;

  const detail = leaveEntries
    .map(
      (entry) =>
        `${entry.name} (${formatShortDayDate(entry.dateIso, entry.dayIndex)})`,
    )
    .join(', ');

  return {
    ruleId: 'leave_coverage_risk',
    title: 'ลาหลายคน',
    summary: detail,
    urlPath: '/schedule',
    priority: 'high',
    modules: ['schedule'],
  };
}

function ruleBeanOrdersPending(snapshot: OperationalSnapshot): Insight | null {
  const { unpaidCount, pendingShipmentCount } = countBeanOrderPendingStatuses(
    snapshot.pendingBeanOrders,
  );
  if (
    unpaidCount + pendingShipmentCount <
    INSIGHT_THRESHOLDS.beanOrdersMinPending
  ) {
    return null;
  }

  const summary = formatPendingBeanOrdersSummary(snapshot.pendingBeanOrders);
  if (!summary) return null;

  return {
    ruleId: 'bean_orders_inventory_gap',
    title: 'ออเดอร์เมล็ดค้าง',
    summary,
    urlPath: '/bean-orders',
    priority: 'normal',
    modules: ['bean_orders'],
  };
}

const RULES = [ruleUnderstaffedWeekly, ruleLeaveCoverageRisk, ruleBeanOrdersPending] as const;

export function evaluateInsightRules(snapshot: OperationalSnapshot): Insight[] {
  const insights: Insight[] = [];
  for (const rule of RULES) {
    const result = rule(snapshot);
    if (result) insights.push(result);
  }
  return insights;
}

/** One daily notification combining every rule that matched at 07:00 ICT. */
export function buildDailyInsightDigest(insights: Insight[]): Insight | null {
  if (insights.length === 0) return null;

  const modules = [...new Set(insights.flatMap((insight) => insight.modules))];
  const priority = insights.some((insight) => insight.priority === 'high') ? 'high' : 'normal';
  const summary = insights
    .map((insight) => `${insight.title}: ${insight.summary}`)
    .join('\n');

  return {
    ruleId: 'daily_digest',
    title: 'การแจ้งเตือนที่ต้องตรวจสอบ',
    summary,
    urlPath: '/dashboard',
    priority,
    modules,
  };
}
