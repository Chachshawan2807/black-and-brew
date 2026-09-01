import type { OperationalSnapshot } from '@/lib/proactive-insights/types';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';
import type { InventoryStockFields } from '@/lib/inventory-stock';

export type SecretaryModule =
  | 'schedule'
  | 'dashboard'
  | 'inventory'
  | 'inventory_count'
  | 'inventory_accuracy'
  | 'branch_withdraw'
  | 'bean_orders'
  | 'maintenance'
  | 'branch2'
  | 'custom';

export type SecretaryTaskType =
  | 'schedule_understaffed'
  | 'schedule_leave_risk'
  | 'schedule_mgmt_review'
  | 'staffing_gap_today'
  | 'inventory_reorder'
  | 'inventory_count_due'
  | 'inventory_accuracy_review'
  | 'branch_withdraw'
  | 'bean_orders_pending'
  | 'bean_payment_pending'
  | 'bean_ship_pending'
  | 'bean_tracking_check'
  | 'maintenance_due'
  | 'maintenance_overdue'
  | 'roast_carry'
  | 'custom';

export type SecretaryTaskPriority = 'urgent' | 'normal' | 'low';
export type SecretaryTaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped';
export type SecretaryTaskSourceKind = 'derived' | 'manual' | 'ai_suggested';

export type SecretaryReorderItem = InventoryStockFields & {
  id: string;
  name: string;
  source: string | null;
  computedOrderQty: number;
};

export type SecretaryCountSessionSlice = {
  totalExactCountItems: number;
  countedTodayCount: number;
  mismatchCount: number;
  isFullyCountedToday: boolean;
};

export const EMPTY_SECRETARY_COUNT_SESSION: SecretaryCountSessionSlice = {
  totalExactCountItems: 0,
  countedTodayCount: 0,
  mismatchCount: 0,
  isFullyCountedToday: true,
};

export type SecretarySnapshot = {
  dateIso: string;
  locale: string;
  operational: OperationalSnapshot;
  itemsToOrder: SecretaryReorderItem[];
  branchWithdrawItems: SecretaryReorderItem[];
  /** Full inventory catalog for branch-withdraw overlay pick list (same fetch as snapshot build). */
  inventoryCatalogItems: SecretaryReorderItem[];
  maintenanceTasks: UpcomingMaintenanceTask[];
  isBranch2Day: boolean;
  branch2Remark?: string;
  headcountToday: number;
  countSession?: SecretaryCountSessionSlice;
};

export type DerivedTaskDraft = {
  taskType: SecretaryTaskType;
  title: string;
  description?: string;
  priority: SecretaryTaskPriority;
  module: SecretaryModule;
  sourceRef: Record<string, unknown>;
  sourceRefHash: string;
  actionHref?: string;
  estimatedMinutes?: number;
  metadata?: Record<string, unknown>;
};

export type SecretaryTask = {
  id: string;
  task_type: SecretaryTaskType;
  title: string;
  description: string | null;
  priority: SecretaryTaskPriority;
  status: SecretaryTaskStatus;
  module: SecretaryModule;
  due_at: string | null;
  scheduled_date: string;
  assignee_profile_id: string | null;
  source_kind: SecretaryTaskSourceKind;
  source_ref: Record<string, unknown> | null;
  source_ref_hash: string | null;
  action_href: string | null;
  metadata: Record<string, unknown> | null;
  completed_at: string | null;
  completed_by: string | null;
  snoozed_until: string | null;
  active_session_started_at: string | null;
  created_at: string;
  updated_at: string;
};
