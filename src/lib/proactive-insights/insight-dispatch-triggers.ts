import type { Insight } from '@/lib/proactive-insights/types';

export type InsightTrigger =
  | 'cron'
  | 'shift_update'
  | 'inventory_update'
  | 'bean_order_update'
  | 'manual';

export const INSIGHT_NOTIFY_TRIGGERS: InsightTrigger[] = [
  'cron',
  'bean_order_update',
  'shift_update',
  'inventory_update',
];

export function shouldDispatchInsightNotification(
  trigger: InsightTrigger,
  matchedRules: Insight[],
): boolean {
  if (!INSIGHT_NOTIFY_TRIGGERS.includes(trigger)) return false;
  if (trigger === 'bean_order_update') {
    return matchedRules.some((rule) => rule.ruleId === 'bean_orders_inventory_gap');
  }
  if (trigger === 'shift_update' || trigger === 'inventory_update') {
    return matchedRules.some((rule) => rule.priority === 'high');
  }
  return true;
}

export function shouldForceInsightDigestRefresh(
  trigger: InsightTrigger,
  existingSummary: string | null,
  nextSummary: string,
): boolean {
  if (
    trigger !== 'bean_order_update' &&
    trigger !== 'shift_update' &&
    trigger !== 'inventory_update'
  ) {
    return false;
  }
  if (existingSummary === null) return false;
  return existingSummary !== nextSummary;
}
