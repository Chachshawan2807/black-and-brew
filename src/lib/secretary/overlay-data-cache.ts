import { fetchBeanOrders } from '@/app/actions/bean-order-actions';
import type { BeanOrderListRow } from '@/app/actions/bean-order-actions';
import {
  fetchScheduleOverlayData,
  type ScheduleOverlayData,
} from '@/app/actions/secretary-overlay-actions';

type BeanOrdersResult = Awaited<ReturnType<typeof fetchBeanOrders>>;

let beanOrdersEntry: { promise: Promise<BeanOrdersResult>; settled?: BeanOrdersResult } | null = null;
let scheduleEntry: {
  promise: Promise<{ success: boolean; data?: ScheduleOverlayData; error?: string }>;
  settled?: { success: boolean; data?: ScheduleOverlayData; error?: string };
} | null = null;

function peekBeanOrdersRows(result: BeanOrdersResult | undefined): BeanOrderListRow[] | null {
  if (result?.success) return result.data ?? [];
  return null;
}

/** Start or reuse bean-order list fetch for secretary overlay. */
export function prefetchBeanOrdersForOverlay(): Promise<BeanOrdersResult> {
  if (!beanOrdersEntry) {
    beanOrdersEntry = {
      promise: fetchBeanOrders().then((result) => {
        if (beanOrdersEntry) beanOrdersEntry.settled = result;
        return result;
      }),
    };
  }
  return beanOrdersEntry.promise;
}

export function peekBeanOrdersForOverlay(): BeanOrderListRow[] | null {
  return peekBeanOrdersRows(beanOrdersEntry?.settled);
}

/** Start or reuse schedule bootstrap fetch for secretary overlay. */
export function prefetchScheduleOverlayData(): Promise<{
  success: boolean;
  data?: ScheduleOverlayData;
  error?: string;
}> {
  if (!scheduleEntry) {
    scheduleEntry = {
      promise: fetchScheduleOverlayData().then((result) => {
        if (scheduleEntry) scheduleEntry.settled = result;
        return result;
      }),
    };
  }
  return scheduleEntry.promise;
}

export function peekScheduleOverlayData(): ScheduleOverlayData | null {
  const settled = scheduleEntry?.settled;
  return settled?.success && settled.data ? settled.data : null;
}

/** @internal Vitest only */
export function resetSecretaryOverlayDataCacheForTests(): void {
  beanOrdersEntry = null;
  scheduleEntry = null;
}
