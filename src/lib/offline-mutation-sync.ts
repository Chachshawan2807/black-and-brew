/** Replay queued offline inventory mutations through Server Actions. */

import {
  reorderInventoryItems,
  updateInventoryItemField,
  updateInventoryStock,
} from '@/app/actions/inventory-actions';
import { isOfflineReplayFailureRetryable } from '@/lib/offline-replay-retry';
import type { OfflineMutation } from '@/lib/offline-mutation-types';

export type OfflineReplayResult =
  | { success: true }
  | { success: false; error: string; retryable: boolean };

function failureResult(error: string, fallback: string): OfflineReplayResult {
  const message = error || fallback;
  return {
    success: false,
    error: message,
    retryable: isOfflineReplayFailureRetryable(message),
  };
}

export async function replayOfflineMutation(
  mutation: OfflineMutation,
): Promise<OfflineReplayResult> {
  try {
    if (mutation.kind === 'inventory_field') {
      const result = await updateInventoryItemField(
        mutation.itemId,
        mutation.field,
        mutation.value,
        { clientSessionId: mutation.clientSessionId },
      );
      if (!result.success) {
        return failureResult(result.error ?? '', 'Field update failed');
      }
      return { success: true };
    }

    if (mutation.kind === 'inventory_stock') {
      const result = await updateInventoryStock(
        mutation.itemId,
        mutation.stock,
        mutation.note,
        {
          clientSessionId: mutation.clientSessionId,
          notificationSource: mutation.notificationSource,
        },
      );
      if (!result.success) {
        return failureResult(result.error ?? '', 'Stock update failed');
      }
      return { success: true };
    }

    const result = await reorderInventoryItems(mutation.sortOrders, {
      clientSessionId: mutation.clientSessionId,
    });
    if (!result.success) {
      return failureResult(result.error ?? '', 'Reorder failed');
    }
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return failureResult(message, 'Replay failed');
  }
}
