/** Offline inventory mutation queue types and helpers. */

import type { InventoryNotificationSource } from '@/lib/inventory-notification-filter';

export const OFFLINE_MUTATION_SYNC_TAG = 'bb-offline-mutations';
export const OFFLINE_MUTATION_DB_NAME = 'bb-offline-mutations-v1';
export const OFFLINE_MUTATION_STORE_NAME = 'mutations';

export type OfflineInventoryFieldMutation = {
  id: string;
  createdAt: number;
  kind: 'inventory_field';
  itemId: string;
  field: string;
  value: string | number;
  clientSessionId?: string;
  authSessionId?: string;
};

export type OfflineInventoryStockMutation = {
  id: string;
  createdAt: number;
  kind: 'inventory_stock';
  itemId: string;
  stock: number;
  note: string;
  clientSessionId?: string;
  authSessionId?: string;
  notificationSource?: InventoryNotificationSource;
};

export type OfflineInventoryReorderMutation = {
  id: string;
  createdAt: number;
  kind: 'inventory_reorder';
  sortOrders: Array<{ id: string; sort_order: number }>;
  clientSessionId?: string;
  authSessionId?: string;
};

export type OfflineMutation =
  | OfflineInventoryFieldMutation
  | OfflineInventoryStockMutation
  | OfflineInventoryReorderMutation;

const NETWORK_ERROR_RE =
  /failed to fetch|networkerror|network error|load failed|offline|timeout|ecconn|enotfound|econnrefused/i;

export function isOfflineRetryableError(error: unknown, isOnline = true): boolean {
  if (!isOnline) return true;
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return NETWORK_ERROR_RE.test(message);
}

export function isOfflineRetryableResult(
  result: { success: boolean; error?: string; retryable?: boolean },
  isOnline = true,
): boolean {
  if (result.success) return false;
  if (!isOnline) return true;
  if (result.retryable === false) return false;
  if (result.retryable === true) return true;
  return NETWORK_ERROR_RE.test(result.error ?? '');
}

export function mergeOfflineFieldMutation(
  existing: OfflineInventoryFieldMutation,
  incoming: OfflineInventoryFieldMutation,
): OfflineInventoryFieldMutation {
  return {
    ...incoming,
    id: existing.id,
    createdAt: existing.createdAt,
  };
}

export type OfflineMutationInput =
  | Omit<OfflineInventoryFieldMutation, 'id' | 'createdAt'>
  | Omit<OfflineInventoryStockMutation, 'id' | 'createdAt'>
  | Omit<OfflineInventoryReorderMutation, 'id' | 'createdAt'>;

export function createOfflineMutationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
