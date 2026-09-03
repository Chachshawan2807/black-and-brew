import type { SecretaryModule, SecretaryTaskPriority, SecretaryTaskType } from '@/lib/secretary/types';

export const MAX_AI_SUGGESTIONS_PER_DAY = 3;

export type AiSuggestionRawItem = {
  suggestionKey: string;
  title: string;
  description?: string;
  module: SecretaryModule;
  priority: SecretaryTaskPriority;
  rationale: string;
  estimatedMinutes?: number;
  actionHref?: string;
};

export type AiSuggestedTaskDraft = {
  taskType: 'custom';
  title: string;
  description?: string;
  priority: SecretaryTaskPriority;
  module: SecretaryModule;
  sourceRef: { suggestionKey: string; rationale: string };
  sourceRefHash: string;
  actionHref?: string;
  estimatedMinutes?: number;
  metadata: { aiSuggested: true; rationale: string; confidence?: 'high' | 'medium' };
};

/** Derived task types that fully cover a secretary module for dedupe. */
export const MODULE_DERIVED_TASK_TYPES: Partial<Record<SecretaryModule, SecretaryTaskType[]>> = {
  inventory: ['inventory_reorder', 'inventory_count_due', 'inventory_accuracy_review'],
  inventory_count: ['inventory_count_due'],
  inventory_accuracy: ['inventory_accuracy_review'],
  branch_withdraw: ['branch_withdraw'],
  schedule: [
    'schedule_understaffed',
    'schedule_leave_risk',
    'schedule_mgmt_review',
    'staffing_gap_today',
  ],
  dashboard: ['staffing_gap_today', 'schedule_understaffed', 'schedule_mgmt_review'],
  bean_orders: [
    'bean_orders_pending',
    'bean_payment_pending',
    'bean_ship_pending',
    'bean_tracking_check',
  ],
  maintenance: ['maintenance_due', 'maintenance_overdue'],
};
