import type { Insight, OperationalSnapshot } from '@/lib/proactive-insights/types';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';
import {
  findUnderstaffedDays,
  sumWeeklyLeave,
  THAI_DAY_LABELS,
} from '@/lib/proactive-insights/week-schedule';

function ruleUnderstaffedWeekly(snapshot: OperationalSnapshot): Insight | null {
  const understaffed = findUnderstaffedDays(snapshot.weeklyDays);
  if (understaffed.length === 0) return null;

  const dayParts = understaffed
    .map((day) => `${THAI_DAY_LABELS[day.dayIndex]} ${day.headcount} คน`)
    .join(', ');

  return {
    ruleId: 'understaffed_low_stock',
    title: 'คนน้อย',
    summary: `สัปดาห์นี้วันที่คนน้อย: ${dayParts} — ควรตรวจตารางงานค่ะ`,
    urlPath: '/schedule',
    priority: 'high',
    modules: ['schedule'],
  };
}

function ruleLeaveCoverageRisk(snapshot: OperationalSnapshot): Insight | null {
  const weeklyLeave = sumWeeklyLeave(snapshot.weeklyDays);
  if (weeklyLeave < INSIGHT_THRESHOLDS.leaveCoverageMinLeave) return null;

  return {
    ruleId: 'leave_coverage_risk',
    title: 'ลาหลายคน',
    summary: `สัปดาห์นี้มีพนักงานลารวม ${weeklyLeave} คน — ควรตรวจตารางงานค่ะ`,
    urlPath: '/schedule',
    priority: 'high',
    modules: ['schedule'],
  };
}

function ruleBeanOrdersPending(snapshot: OperationalSnapshot): Insight | null {
  if (snapshot.pendingBeanOrders < INSIGHT_THRESHOLDS.beanOrdersMinPending) return null;

  return {
    ruleId: 'bean_orders_inventory_gap',
    title: 'ออเดอร์เมล็ดค้าง',
    summary: `ออเดอร์เมล็ดค้าง ${snapshot.pendingBeanOrders} รายการ — ควรตรวจสอบค่ะ`,
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
