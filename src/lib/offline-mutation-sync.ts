/** Replay queued offline inventory mutations through Server Actions. */

import {
  reorderInventoryItems,
  updateInventoryItemField,
  updateInventoryStock,
} from '@/app/actions/inventory-actions';
import { isOfflineReplayFailureRetryable } from '@/lib/offline-replay-retry';
import { toUserFacingError } from '@/lib/user-facing-error';
import type { OfflineMutation } from '@/lib/offline-mutation-types';

export type OfflineReplayResult =
  | { success: true }
  | { success: false; error: string; retryable: boolean };

function failureResult(error: string, fallbackTh: string): OfflineReplayResult {
  const message = toUserFacingError(error || fallbackTh, fallbackTh);
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
        {
          clientSessionId: mutation.clientSessionId,
          notificationSource: mutation.notificationSource,
        },
      );
      if (!result.success) {
        return failureResult(result.error ?? '', 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
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
        return failureResult(result.error ?? '', 'บันทึกสต็อกไม่สำเร็จ กรุณาลองใหม่');
      }
      return { success: true };
    }

    const result = await reorderInventoryItems(mutation.sortOrders, {
      clientSessionId: mutation.clientSessionId,
    });
    if (!result.success) {
      return failureResult(result.error ?? '', 'บันทึกลำดับไม่สำเร็จ กรุณาลองใหม่');
    }
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return failureResult(message, 'ซิงค์ออฟไลน์ไม่สำเร็จ กรุณาลองใหม่');
  }
}
