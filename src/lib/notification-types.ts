import type { DataChangeAction } from '@/lib/data-change-log';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';

export const NOTIFICATION_STORAGE_KEY = 'bb-inventory-notifications';
export const NOTIFICATION_PREFS_KEY = 'bb-notification-prefs';
export const MAX_STORED_NOTIFICATIONS = 50;
export const BATCH_WINDOW_MS = 2000;

export type NotificationPriority = 'normal' | 'high';

export interface InventoryNotification {
  id: string;
  logId: string;
  action: DataChangeAction;
  entityId: string | null;
  entityLabel: string | null;
  actorLabel: string;
  occurredAt: string;
  title: string;
  summary: string;
  fieldSummary: string;
  priority: NotificationPriority;
  read: boolean;
  batchedCount: number;
  metadata: Record<string, unknown>;
}

export interface NotificationPreferences {
  enabled: boolean;
  showToast: boolean;
  notifyOwnChanges: boolean;
  notifyCreate: boolean;
  notifyUpdate: boolean;
  notifyDelete: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  showToast: true,
  notifyOwnChanges: false,
  notifyCreate: true,
  notifyUpdate: true,
  notifyDelete: true,
};

export interface NotificationToastState {
  notification: InventoryNotification;
  visible: boolean;
}

export function logRowToNotificationInput(row: DataChangeLogRow): Omit<InventoryNotification, 'title' | 'summary' | 'fieldSummary' | 'priority'> {
  return {
    id: row.id,
    logId: row.id,
    action: row.action as DataChangeAction,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    actorLabel: row.actor_label,
    occurredAt: row.occurred_at,
    read: false,
    batchedCount: 1,
    metadata: row.metadata ?? {},
  };
}
