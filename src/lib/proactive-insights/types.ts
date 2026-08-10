import type { NotificationPriority } from '@/lib/notification-types';

export type InsightRuleId =
  | 'understaffed_low_stock'
  | 'leave_coverage_risk'
  | 'bean_orders_inventory_gap'
  | 'daily_digest';

export interface WeeklyLeaveStaff {
  name: string;
}

export interface WeeklyDaySchedule {
  dateIso: string;
  /** 0 = Monday … 6 = Sunday */
  dayIndex: number;
  headcount: number;
  leaveCount: number;
  leaveStaff: WeeklyLeaveStaff[];
}

export interface PendingBeanOrderInsight {
  customerName: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}

export interface OperationalSnapshot {
  dateIso: string;
  dateDisplay: string;
  locale: string;
  headcount: number;
  leaveCount: number;
  offCount: number;
  weeklyDays: WeeklyDaySchedule[];
  pendingBeanOrders: PendingBeanOrderInsight[];
  yesterdaySalesTotal: number;
  upcomingHoliday: { name: string; daysRemaining: number } | null;
}

export interface Insight {
  ruleId: InsightRuleId;
  title: string;
  summary: string;
  urlPath: string;
  priority: NotificationPriority;
  modules: string[];
}

