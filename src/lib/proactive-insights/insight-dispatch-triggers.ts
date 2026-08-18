import type { Insight } from '@/lib/proactive-insights/types';

export type InsightTrigger =
  | 'cron'
  | 'shift_update'
  | 'inventory_update'
  | 'bean_order_update'
  | 'manual';

export const REALTIME_INSIGHT_TRIGGERS: InsightTrigger[] = [
  'cron',
  'bean_order_update',
  'shift_update',
  'inventory_update',
];

export const INSIGHT_NOTIFY_TRIGGERS: InsightTrigger[] = ['cron'];

export function isRealtimeInsightTrigger(trigger: InsightTrigger): boolean {
  return trigger === 'bean_order_update' || trigger === 'shift_update' || trigger === 'inventory_update';
}

/** Web Push / OS banners fire only from the scheduled daily cron — not realtime refreshes. */
export function shouldPushInsightNotification(trigger: InsightTrigger): boolean {
  return trigger === 'cron';
}

export function shouldDispatchInsightNotification(
  trigger: InsightTrigger,
  matchedRules: Insight[],
): boolean {
  if (!INSIGHT_NOTIFY_TRIGGERS.includes(trigger)) return false;
  return matchedRules.length > 0;
}

export function shouldForceInsightDigestRefresh(
  trigger: InsightTrigger,
  existingSummary: string | null,
  nextSummary: string,
): boolean {
  if (!isRealtimeInsightTrigger(trigger)) {
    return false;
  }
  if (existingSummary === null) return false;
  return existingSummary !== nextSummary;
}
