import { promiseWithTimeout } from '@/lib/promise-with-timeout';
import {
  invalidateScheduleOverlayCache,
  prefetchScheduleOverlayData,
} from '@/lib/secretary/overlay-data-cache';
import type { ScheduleOverlayData } from '@/app/actions/secretary-overlay-actions';

export const SCHEDULE_OVERLAY_FETCH_TIMEOUT_MS = 20_000;

export const SCHEDULE_OVERLAY_TIMEOUT_MESSAGE =
  'โหลดตารางงานนานเกินไป กรุณาลองใหม่อีกครั้ง';

export type ScheduleOverlayFetchResult = {
  success: boolean;
  data?: ScheduleOverlayData;
  error?: string;
};

export async function fetchScheduleOverlayWithTimeout(): Promise<ScheduleOverlayFetchResult> {
  try {
    return await promiseWithTimeout(
      prefetchScheduleOverlayData(),
      SCHEDULE_OVERLAY_FETCH_TIMEOUT_MS,
      SCHEDULE_OVERLAY_TIMEOUT_MESSAGE,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ไม่สามารถโหลดตารางงานได้';
    return { success: false, error: message };
  }
}

export function retryScheduleOverlayFetch(): void {
  invalidateScheduleOverlayCache();
}
